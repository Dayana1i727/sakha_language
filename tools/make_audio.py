# -*- coding: utf-8 -*-
"""Нарезка длинной записи на отдельные слова и сборка manifest.json.

Синтезатор отдаёт один wav со всеми словами батча (между ними — паузы по точкам).
Скрипт находит паузы, режет запись, подчищает края, выравнивает громкость,
кодирует в mp3 и раскладывает по assets/audio.
"""
import json, sys, re, pathlib
import numpy as np
import soundfile as sf
import lameenc
from scipy.signal import resample_poly

ROOT = pathlib.Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio"
MANIFEST = AUDIO / "manifest.json"

TR = {'а':'a','б':'b','в':'v','г':'g','ҕ':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y',
      'к':'k','л':'l','м':'m','н':'n','ҥ':'ng','о':'o','ө':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
      'ү':'u','ф':'f','х':'h','һ':'h','ц':'c','ч':'ch','ш':'sh','щ':'sh','ъ':'','ы':'y','ь':'','э':'e',
      'ю':'yu','я':'ya'}

def slug(text):
    low = text.lower()
    out = []
    for ch in low:
        if ch in TR: out.append(TR[ch])
        elif ch.isalpha(): out.append(ch)
        elif ch in ' -': out.append('-')
    s = re.sub('-+', '-', ''.join(out)).strip('-')
    return s or 'word'

def split_segments(y, sr, expected):
    """Ищем паузы: возвращает список (start, end) в сэмплах."""
    frame = max(1, int(sr * 0.01))            # 10 мс
    n = len(y) // frame
    env = np.abs(y[:n * frame]).reshape(n, frame).max(axis=1)
    peak = float(env.max()) or 1.0
    thr = peak * 0.02
    loud = env > thr
    # сглаживаем: короткие провалы внутри слова не считаем паузой
    min_gap = int(0.12 / 0.01)                # 120 мс тишины = граница
    segs, start = [], None
    quiet_run = 0
    for i, v in enumerate(loud):
        if v:
            if start is None: start = i
            quiet_run = 0
        else:
            if start is not None:
                quiet_run += 1
                if quiet_run >= min_gap:
                    end = i - quiet_run + 1
                    if (end - start) * 0.01 >= 0.06:
                        segs.append((start, end))
                    start = None
                    quiet_run = 0
    if start is not None and (n - start) * 0.01 >= 0.06:
        segs.append((start, n))
    # если получилось больше/меньше — подрезаем или склеиваем самые короткие
    if len(segs) == expected:
        return [(a * frame, b * frame) for a, b in segs]
    return [(a * frame, b * frame) for a, b in segs], len(segs)

def encode_mp3(samples, sr, bitrate=64):
    x = np.clip(samples, -1, 1)
    pcm = (x * 32767).astype('<i2')
    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    data = enc.encode(pcm.tobytes()) + enc.flush()
    return data

def process(wav_path, keys, texts, pad=0.06):
    """keys/texts — что должно быть в этом батче, по порядку."""
    y, sr = sf.read(str(wav_path), dtype='float32', always_2d=False)
    if y.ndim > 1: y = y.mean(axis=1)
    res = split_segments(y, sr, len(keys))
    if isinstance(res, tuple):
        segs, got = res
        raise SystemExit(f"Батч {wav_path.name}: пауз найдено {got}, слов {len(keys)} — подгони порог")
    segs = res
    man = json.loads(MANIFEST.read_text(encoding='utf-8')) if MANIFEST.exists() else {}
    used = set(man.values())
    out = {}
    for (a, b), key, text in zip(segs, keys, texts):
        clip = y[max(0, a - int(pad * sr)): min(len(y), b + int(pad * sr))]
        # выравниваем громкость и мягко обрезаем
        peak = float(np.abs(clip).max()) or 1.0
        clip = clip / peak * 0.89
        clip = np.concatenate([np.zeros(int(0.02 * sr), dtype='float32'), clip,
                               np.zeros(int(0.06 * sr), dtype='float32')])
        if sr != 22050:
            clip = resample_poly(clip, 22050, sr).astype('float32')
        name = 'sah-' + slug(text) + '.mp3'
        i = 2
        while name in used:
            name = f'sah-{slug(text)}-{i}.mp3'; i += 1
        used.add(name)
        (AUDIO / name).write_bytes(encode_mp3(clip, 22050))
        out[key] = name
    man.update(out)
    MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"{wav_path.name}: {len(segs)} клипов -> manifest ({len(man)} всего)")
    return out

if __name__ == '__main__':
    wav = pathlib.Path(sys.argv[1])
    batch = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding='utf-8'))
    keys = [b['key'] for b in batch]
    texts = [b['say'] for b in batch]
    process(wav, keys, texts)
