import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

const root = process.cwd();
const dishesDirectory = join(root, "third_party", "HowToCook", "dishes");
const outputPath = join(
  root,
  "src",
  "data",
  "generated",
  "how-to-cook-recipes.json",
);

// 服务器上没有 third_party/HowToCook 时跳过导入，沿用已提交的生成文件。
let dishesExists = false;
try {
  dishesExists = (await stat(dishesDirectory)).isDirectory();
} catch {
  dishesExists = false;
}
if (!dishesExists) {
  console.log(
    "third_party/HowToCook not found; keeping the committed generated recipes JSON.",
  );
  process.exit(0);
}
const categoryNames = {
  aquatic: "水产",
  breakfast: "早餐",
  condiment: "调味",
  dessert: "甜品",
  drink: "饮品",
  meat_dish: "肉类",
  "semi-finished": "半成品",
  soup: "汤羹",
  staple: "主食",
  vegetable_dish: "蔬菜",
};

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectMarkdownFiles(path);
      return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
    }),
  );
  return children.flat();
}

function section(markdown, heading) {
  const expression = new RegExp(
    `^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s+|$)`,
    "m",
  );
  return markdown.match(expression)?.[1]?.trim() ?? "";
}

function listItems(value) {
  return value
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

function parseRecipe(path, markdown) {
  const sourcePath = relative(dishesDirectory, path).replaceAll(sep, "/");
  const relativePath = sourcePath.split("/");
  const sourceCategory = relativePath[0];
  const heading =
    markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
    relativePath.at(-1).replace(/\.md$/, "");
  const title = heading
    .replace(/的做法$/, "")
    .replace(/做法$/, "")
    .trim();
  const paragraphs = markdown.split("\n").map((line) => line.trim());
  const description =
    paragraphs.find(
      (line) =>
        line &&
        !line.startsWith("#") &&
        !line.startsWith("-") &&
        !/^\d+[.)]/.test(line),
    ) ?? "";
  const calorie = markdown.match(/预估卡路里[：:]\s*(\d+)/)?.[1];
  const difficulty = markdown
    .match(/预估烹饪难度[：:]\s*([^\n]+)/)?.[1]
    ?.trim();
  const ingredients = listItems(
    section(markdown, "必备原料和工具") || section(markdown, "原料"),
  );
  const steps = listItems(section(markdown, "操作"));
  return {
    id: sourcePath.replace(/\.md$/, ""),
    title,
    category: categoryNames[sourceCategory] ?? sourceCategory,
    sourceCategory,
    description,
    estimatedCalories: calorie ? Number(calorie) : null,
    difficulty: difficulty ?? null,
    ingredients,
    steps,
    markdown,
    sourcePath: `dishes/${sourcePath}`,
  };
}

const files = await collectMarkdownFiles(dishesDirectory);
const recipes = (
  await Promise.all(
    files.map(async (path) => parseRecipe(path, await readFile(path, "utf8"))),
  )
)
  .filter((recipe) => recipe.sourceCategory !== "template")
  .sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(recipes)}\n`, "utf8");
console.log(`Imported ${recipes.length} recipes from HowToCook.`);
