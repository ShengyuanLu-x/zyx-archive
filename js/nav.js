// 导航目录树的共用逻辑。首页和分类页都会用到这个文件。
// 日常维护资料一般不需要碰这个文件，只需要改 data/nav.json 和 data/events 里的内容。

async function loadNav() {
  return fetchJson("data/nav.json");
}

// 给根节点一个统一的形状，方便复用同一套渲染逻辑
function rootNode(nav) {
  return { id: "", title: "", children: nav.tabs };
}

// 在树里根据 id 找节点，同时把从根到这个节点的路径（面包屑）记录下来
function findNodePath(node, targetId, path) {
  const currentPath = [...path, node];
  if (node.id === targetId) return currentPath;
  for (const child of node.children || []) {
    if (child.type) continue; // 叶子内容（event/link），不参与目录查找
    const found = findNodePath(child, targetId, currentPath);
    if (found) return found;
  }
  return null;
}

async function loadNodePath(id) {
  const nav = await loadNav();
  const root = rootNode(nav);
  if (!id) return [root];
  const path = findNodePath(root, id, []);
  if (!path) throw new Error(`找不到分类 "${id}"，请检查 data/nav.json`);
  return path;
}
