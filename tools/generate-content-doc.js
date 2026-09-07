// 把 data/nav.json + data/events/*.json 的内容，生成一份跟网站实际内容同步的 Word 文档
// （给完全不懂编程的人看/编辑用，格式是编号大纲，链接可点击，绿色字体是给以后维护者/AI看的结构性说明）。
//
// 怎么运行（需要先装 Node.js，和一次性运行 `npm install docx`）：
//   cd tools
//   npm install docx   （只需要装一次）
//   node generate-content-doc.js
// 会在仓库根目录生成/覆盖 "Archive of Lay - 网站内容备份.docx"（这个文件本身没有提交到 GitHub，
// 因为它是可以随时重新生成的"衍生文件"，不是真正的数据源——data/nav.json 才是）。

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink,
  AlignmentType, BorderStyle, HeadingLevel,
} = require("docx");

const HEADING_BY_DEPTH = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

const ROOT = path.join(__dirname, "..");
const nav = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "nav.json"), "utf-8"));

function loadEvent(eventId) {
  const p = path.join(ROOT, "data", "events", `${eventId}.json`);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

const GREEN = "185030";
const MUTED = "666666";
const CATEGORY_ORDER = ["正式内容", "官方物料", "当时的讨论", "其他"];

const paragraphs = [];

function push(p) { paragraphs.push(p); }

function headingIndent(depth) {
  return 360 * (depth - 1); // twips, ~0.25in per depth level
}

function pushHeading(depth, numberPrefix, title) {
  push(new Paragraph({
    heading: HEADING_BY_DEPTH[depth] || HeadingLevel.HEADING_6,
    indent: { left: headingIndent(depth) },
    spacing: { before: depth === 1 ? 360 : 220, after: 80 },
    children: [
      new TextRun({ text: `${numberPrefix} ${title}` }),
    ],
  }));
}

function pushDivider(depth, label) {
  push(new Paragraph({
    indent: { left: headingIndent(depth) + 200 },
    spacing: { before: 160, after: 80 },
    border: { bottom: { color: "B7A9CE", space: 4, style: BorderStyle.SINGLE, size: 6 } },
    children: [new TextRun({ text: label, bold: true, italics: true, color: "6A5A8C", size: 20 })],
  }));
}

function pushLinkLine(depth, platform, title, url, options = {}) {
  const prefix = options.categoryPrefix ? `[${options.categoryPrefix}] ` : "";
  const children = [
    new TextRun({ text: `${prefix}${platform ? platform + "｜" : ""}${title || "(未命名链接)"}`, size: 20 }),
  ];
  if (url) {
    children.push(new TextRun({ text: "：", size: 20 }));
    children.push(
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text: url, style: "Hyperlink", size: 20 })],
      })
    );
  } else {
    children.push(new TextRun({ text: "（待补充）", size: 20, italics: true, color: MUTED }));
  }
  push(new Paragraph({
    indent: { left: headingIndent(depth) + 200 },
    spacing: { after: 60 },
    children,
  }));
}

function pushEvent(depth, eventId) {
  let ev;
  try {
    ev = loadEvent(eventId);
  } catch (e) {
    push(new Paragraph({
      indent: { left: headingIndent(depth) + 200 },
      children: [new TextRun({ text: `⚠ 事件文件缺失：${eventId}`, color: "B00020", size: 20 })],
    }));
    return;
  }
  push(new Paragraph({
    heading: HEADING_BY_DEPTH[depth + 1] || HeadingLevel.HEADING_6,
    indent: { left: headingIndent(depth) + 200 },
    spacing: { before: 120, after: 20 },
    children: [
      new TextRun({ text: `● ${ev.title}` }),
      new TextRun({ text: `（${ev.date || "日期未知"}）`, color: MUTED }),
    ],
  }));
  if (ev.summary) {
    push(new Paragraph({
      indent: { left: headingIndent(depth) + 260 },
      spacing: { after: 40 },
      children: [new TextRun({ text: ev.summary, italics: true, size: 19, color: MUTED })],
    }));
  }
  const materials = ev.materials || [];
  if (materials.length === 0) {
    push(new Paragraph({
      indent: { left: headingIndent(depth) + 260 },
      spacing: { after: 60 },
      children: [new TextRun({ text: "（暂无物料）", italics: true, size: 19, color: MUTED })],
    }));
    return;
  }
  const byCat = new Map();
  for (const cat of CATEGORY_ORDER) byCat.set(cat, []);
  for (const m of materials) {
    const cat = m.category && m.category.trim() ? m.category : "其他";
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(m);
  }
  for (const [cat, items] of byCat) {
    if (items.length === 0) continue;
    for (const m of items) {
      pushLinkLine(depth + 1, m.platform, m.title, m.url, { categoryPrefix: cat });
    }
  }
}

function pushNote(depth, text) {
  push(new Paragraph({
    indent: { left: headingIndent(depth) + 200 },
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text: `【说明】${text}`, color: GREEN, bold: true, size: 19 })],
  }));
}

// 结构性说明：人工维护的一份"给以后维护者/AI看"的备注清单，key 是节点 id 或 eventId。
// 以后如果又做了类似的结构调整（比如把两条内容合并成一个事件），可以在这里加一条新的说明。
const NOTES = {
  "new-year-stage": "以下「跨年舞台」每一年都是一个独立的「事件」（点进网站会看到日期+多条物料）；141231 等暂时没有链接的年份先留空占位。",
  "new-year-2019-farewell-concubine": "191231 当晚实际上有两个舞台：《霸王别姬》和《梦不落雨林》，拆成了两个独立事件（见下一条）。",
  "spring-festival-gala": "以下「春晚」把央视春晚和地方台春晚合并、按年份从新到旧排列，不再单独区分「央视/地方台」。",
  "other-stages": "2019 年下面原本是两个不同舞台的资料，已经合并成一个事件（因为都是同一年、同一批饭拍/讨论资料）。",
  "concert-tours": "演唱会目前只有「一巡」下面列了几个具体场次（城市站），且这几个场次现在都还没有具体资料链接；二巡/三巡/四巡/五巡/2.5巡/跨年演唱会都还是空的，等有具体资料再补充。",
};

function numberOf(counters, depth) {
  return counters.slice(0, depth).join(".");
}

function walk(node, depth, counters) {
  const children = node.children || [];
  let idx = 0;
  for (const child of children) {
    if (child.type === "divider") {
      pushDivider(depth, child.label);
    } else if (child.type === "event") {
      pushEvent(depth, child.eventId);
      if (NOTES[child.eventId]) pushNote(depth, NOTES[child.eventId]);
    } else if (child.type === "link") {
      pushLinkLine(depth, child.platform, child.title, child.url);
    } else {
      idx += 1;
      const newCounters = counters.slice(0, depth);
      newCounters.push(idx);
      const prefix = numberOf(newCounters, depth + 1);
      pushHeading(depth + 1, prefix + ".", child.title);
      if (child.intro) {
        push(new Paragraph({
          indent: { left: headingIndent(depth + 1) + 200 },
          spacing: { after: 80 },
          children: [new TextRun({ text: `“${child.intro}”`, italics: true, size: 20, color: MUTED })],
        }));
      }
      if (NOTES[child.id]) pushNote(depth + 1, NOTES[child.id]);
      walk(child, depth + 1, newCounters);
    }
  }
}

// ---------- 标题 + 说明 ----------
push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [new TextRun({ text: "Archive of Lay · 网站内容结构备份", bold: true, size: 36 })],
}));
push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 300 },
  children: [new TextRun({ text: `导出时间：${new Date().toISOString().slice(0, 10)}（自动从 data/nav.json + data/events 生成，反映网站当前真实内容）`, size: 18, color: MUTED })],
}));
push(new Paragraph({
  spacing: { after: 60 },
  children: [new TextRun({ text: "颜色说明：黑色文字＝网站上的真实分类/资料内容；", size: 19 }),
    new TextRun({ text: "绿色加粗文字＝给以后维护者/AI看的结构性说明，不是网站上会显示的内容", size: 19, color: GREEN, bold: true }),
    new TextRun({ text: "。", size: 19 })],
}));
push(new Paragraph({
  spacing: { after: 300 },
  children: [new TextRun({ text: "以后如果想更新网站内容：直接在这份文档里改（加/删/改标题、网址），改完导出成 Word 或 PDF 发给 Claude，让它对照更新网站代码即可。", size: 19, color: MUTED, italics: true })],
}));

let topIdx = 0;
for (const tab of nav.tabs) {
  topIdx += 1;
  pushHeading(1, `${topIdx}.`, tab.title);
  if (tab.intro) {
    push(new Paragraph({
      indent: { left: headingIndent(1) + 200 },
      spacing: { after: 80 },
      children: [new TextRun({ text: `“${tab.intro}”`, italics: true, size: 20, color: MUTED })],
    }));
  }
  if (NOTES[tab.id]) pushNote(1, NOTES[tab.id]);
  walk(tab, 1, [topIdx]);
}

const doc = new Document({
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 } } },
    children: paragraphs,
  }],
  styles: {
    default: {
      document: { run: { font: "Microsoft YaHei", size: 20 } },
    },
  },
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, "Archive of Lay - 网站内容备份.docx");
  fs.writeFileSync(out, buf);
  console.log("written:", out, buf.length, "bytes");
});
