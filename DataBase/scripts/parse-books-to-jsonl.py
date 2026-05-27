#!/usr/bin/env python3
"""Parse epub/pdf/mobi/azw3 books from Downloads into a JSONL file for import."""
import json
import os
import sys
import hashlib
import re
from pathlib import Path

try:
    import ebooklib
    from ebooklib import epub
except ImportError:
    ebooklib = None

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

DOWNLOADS = Path(r"C:\Users\ASUS-KL\Downloads")
OUTPUT = Path(r"E:\My Project\ContentMRS\DataBase\scripts\parsed-books.jsonl")

BOOKS = [
    ("石黑一雄作品集全套5册.epub", "book_ishiguro_full_5"),
    ("金阁寺.epub", "book_kinkakuji_epub"),
    ("夏目漱石爱情三部曲.epub", "book_natsume_love_trilogy"),
    ("夏目漱石四部曲（善于精细描写个人心理的日本国民大作家—夏目漱石代表作！炽烈的爱情和反自然主义经典，永不褪色的人性思考！）.azw3", "book_natsume_quartet"),
    ("太宰治【极致典藏系列 人间失格 晚年 斜阳 御伽草纸 维庸之妻 奔跑吧,梅勒斯】（6册套装）.epub", "book_dazai_6vol"),
    ("宫崎市定中国史【豆瓣8.1分！史学泰斗、"汉学诺贝尔奖"儒莲奖得主宫崎市定核心著作，写给普通读者的通识经典！旁观者的视角，世界史的立场，展现不一样的中国历史脉络！】.epub", "book_miyazaki_china_history"),
    ("禹域鸿爪（日本东洋学京都学派创始人之一，著名日本汉学家内藤湖南著。与严复、文廷式、张元济畅谈中国政治的笔谈实录）【东瀛文人·印象中国】.epub", "book_naito_yuyu"),
    ("支那革命的真相：來自日本的視角與立場  支那革命外史.epub", "book_shina_revolution"),
    ("我的前半生.epub", "book_puyi_epub"),
    ("兴亡的世界史全21卷.epub", "book_xingwang_epub"),
    ("中国游记(日本大正文学代表人物,日本文坛三巨匠之一芥川龙之介作品著名译者施小炜全新译本) (【东瀛文人·印象中国】).epub", "book_akutagawa_china"),
    ("紫图经典文库：三岛由纪夫大合集（全10册）（诺奖三度提名;世纪天才;"文艺青年之神"——必读的三岛由纪夫9大经典力作：极限写作五部曲+20世纪的文学奇迹：《丰饶之海》四部曲，权威译者陈德文译本2021全新修订！）.epub", "book_mishima_10vol"),
    ("鲜花盛开的森林（三岛由纪夫生前亲自编选的短篇小说集。没有比死更大的羞耻，每一篇故事的主角都有三岛由纪夫的影子。）(果麦经典) (三岛由纪夫代表作品集 1).azw3", "book_mishima_flowers"),
    ("川端康成必讀套裝：雪國+古都+千羽鶴+伊豆的舞女+花未眠+美麗與哀愁+花之圓舞曲（全7冊）（50週年紀念珍藏版！諾貝爾文學獎得主，日式東方美學標杆！細膩到揪心、美得令人窒息的川端康成文學世界，學者型翻譯名家陳德文9分譯本）.epub", "book_kawabata_7vol"),
    ("民国时权威的《鲁迅全集》！（全20册）（收录鲁迅一生全部作品，完全无删改，原汁原味鲁迅的文字！1938年"鲁迅先生纪念委员会"编印版。简体横排，权威定本！市面上最通俗好读的鲁迅版本！）.epub", "book_luxun_full_20vol"),
    ("坂口安吾短篇推理系列（套装全3册）（"无赖派"旗手坂口安吾的短篇侦探推理小说作品集，日本人气动漫《UN-GO》 、漫画《东京开化事件谭》原著小说及超人气动漫《文豪野犬》原型人物）.pdf", "book_sakaguchi_mystery"),
    ("日本改造法案 北一辉之死 二幕七场话剧.pdf", "book_kita_ikki_drama"),
    ("内藤湖南 政治与汉学 1866-1934.pdf", "book_naito_politics"),
    ("内藤湖南的世界 亚洲再生的思想.pdf", "book_naito_world"),
    ("近代海外汉学名著丛刊 塞外史地论文译丛 上.pdf", "book_saiwai_shidi_essays"),
    ("[宫崎市定亚洲史论考]中国的历史思想 宫崎市定论中国史.pdf", "book_miyazaki_asia"),
    ("资治通鉴 5 卷124-155 宋文帝元嘉十九年壬午起 梁武帝中大通四年壬子止.pdf", "book_zizhi_tongjian_5"),
    ("马克思恩格斯全集 第32卷 1861-1863 资本论及手稿 第2版.pdf", "book_marx_vol32_pdf"),
    ("全唐诗.mobi", "book_quantangshi_mobi"),
    ("全唐诗（下）.mobi", "book_quantangshi_2_mobi"),
    ("全唐诗 第十三册 卷八六八－卷九○○ 全唐诗逸 补全唐诗 补全唐诗 补代全唐诗拾遗 全唐诗补逸.pdf", "book_quantangshi_13"),
    ("202434810余奎V0524查重版.pdf", "thesis_yukui"),
    ("202219112张淦宁0524V2-查重版.pdf", "thesis_zhanganning"),
    ("202212906孙浩东最终查重版V0523（修改建议）.pdf", "thesis_sunhaodong"),
    ("东瀛文人·印象中国（套装共5册）（日本文坛三巨匠之一芥川龙之介，及谷崎润一郎、佐藤春夫等日本20世纪初重量级文人，游历中国亲见实录。）.pdf", "book_dongying_wenren_5vol"),
]

# Also check for Japanese-only epubs
EXTRA_EPUBS = [
    ("『夏目漱石全集・122作品⇒1冊』.epub", "book_natsume_122works"),
    ("僕の見た「大日本帝国」.epub", "book_boku_dainippon"),
    ("東条英機 大日本帝国に殉じた男 (PHP文庫).epub", "book_tojo_hideki"),
]

BOOKS += EXTRA_EPUBS


def parse_epub(filepath):
    """Extract text from epub."""
    if not ebooklib:
        return []
    try:
        book = epub.read_epub(str(filepath), options={"ignore_ncx": True})
    except Exception as e:
        print(f"  WARN: cannot read epub {filepath.name}: {e}", file=sys.stderr)
        return []
    texts = []
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        content = item.get_content().decode("utf-8", errors="ignore")
        # Strip HTML tags
        clean = re.sub(r"<[^>]+>", " ", content)
        clean = re.sub(r"&[a-z]+;", " ", clean)
        clean = re.sub(r"\s+", " ", clean).strip()
        if len(clean) > 50:
            texts.append(clean)
    return texts


def parse_pdf(filepath):
    """Extract text from PDF."""
    if not PdfReader:
        return []
    try:
        reader = PdfReader(str(filepath))
    except Exception as e:
        print(f"  WARN: cannot read pdf {filepath.name}: {e}", file=sys.stderr)
        return []
    texts = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
            text = re.sub(r"\s+", " ", text).strip()
            if len(text) > 50:
                texts.append(text)
        except Exception:
            continue
    return texts


def chunk_pages(pages, chunk_chars=1800):
    """Merge pages into chunks of ~chunk_chars."""
    chunks = []
    current = ""
    for page in pages:
        if len(current) + len(page) + 2 > chunk_chars and current:
            chunks.append(current.strip())
            current = page
        else:
            current = (current + "\n\n" + page).strip() if current else page
    if current:
        chunks.append(current.strip())
    return [c for c in chunks if len(c) >= 50]


def main():
    out = open(OUTPUT, "w", encoding="utf-8")
    total = 0
    for filename, source_id in BOOKS:
        filepath = DOWNLOADS / filename
        if not filepath.exists():
            print(f"  SKIP (not found): {filename}")
            continue
        ext = filepath.suffix.lower()
        if ext == ".epub":
            pages = parse_epub(filepath)
        elif ext == ".pdf":
            pages = parse_pdf(filepath)
        elif ext in (".mobi", ".azw3"):
            # mobi/azw3 need calibre's ebook-convert; skip if not available
            print(f"  SKIP (mobi/azw3 needs calibre): {filename}")
            continue
        else:
            print(f"  SKIP (unknown format): {filename}")
            continue

        chunks = chunk_pages(pages, 1800)
        for chunk in chunks:
            record = {
                "sourceId": source_id,
                "sourceFile": str(filepath),
                "title": filename.split("（")[0].split("【")[0].split(".")[0].strip(),
                "provider": "local.book_corpus",
                "text": chunk,
            }
            out.write(json.dumps(record, ensure_ascii=False) + "\n")
            total += 1
        print(f"  {filename[:40]}... -> {len(chunks)} chunks")

    out.close()
    print(f"\nTotal: {total} chunks written to {OUTPUT}")


if __name__ == "__main__":
    main()
