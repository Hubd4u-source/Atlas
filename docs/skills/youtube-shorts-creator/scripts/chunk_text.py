#!/usr/bin/env python3
import argparse
import os
import re


def split_sentences(text):
    text = re.sub(r"\s+", " ", text.strip())
    if not text:
        return []
    return re.split(r"(?<=[.!?])\s+", text)


def chunk_text(text, min_words=120, max_words=160):
    sentences = split_sentences(text)
    chunks = []
    current = []
    word_count = 0

    def flush():
        nonlocal current, word_count
        if current:
            chunks.append(" ".join(current).strip())
        current = []
        word_count = 0

    for sentence in sentences:
        words = sentence.split()
        if len(words) > max_words:
            if current:
                flush()
            for i in range(0, len(words), max_words):
                part = " ".join(words[i:i + max_words]).strip()
                if part:
                    chunks.append(part)
            continue

        if word_count + len(words) > max_words:
            if word_count >= min_words:
                flush()
            else:
                flush()
        current.append(sentence)
        word_count += len(words)

    if current:
        flush()

    return chunks


def main():
    parser = argparse.ArgumentParser(description='Chunk text into word-balanced parts')
    parser.add_argument('--input', dest='input_path')
    parser.add_argument('--text', dest='text')
    parser.add_argument('--out', dest='out_dir', required=True)
    parser.add_argument('--prefix', dest='prefix', default='voice')
    parser.add_argument('--min', dest='min_words', type=int, default=120)
    parser.add_argument('--max', dest='max_words', type=int, default=160)
    args = parser.parse_args()

    if not args.input_path and not args.text:
        raise SystemExit('Provide --input or --text')

    if args.input_path:
        with open(args.input_path, 'r', encoding='utf-8') as f:
            text = f.read()
    else:
        text = args.text

    chunks = chunk_text(text, args.min_words, args.max_words)
    os.makedirs(args.out_dir, exist_ok=True)

    for i, chunk in enumerate(chunks, start=1):
        name = f"{args.prefix}_part_{i:02d}.txt"
        path = os.path.join(args.out_dir, name)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(chunk.strip() + "\n")

    print("\n".join([os.path.join(args.out_dir, f"{args.prefix}_part_{i:02d}.txt") for i in range(1, len(chunks) + 1)]))


if __name__ == '__main__':
    main()
