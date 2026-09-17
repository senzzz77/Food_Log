import type { RowDataPacket } from "mysql2";
import { config } from "./config.js";
import { database } from "./database.js";

export interface VisionFood {
  name: string;
  estimate: {
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  } | null;
}

type QwenMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content:
        | string
        | Array<{ type: "image_url"; image_url: { url: string } } | { type: "text"; text: string }>;
    };

const SYSTEM_PROMPT =
  "你是一个食物识别与营养估算助手。你只输出 JSON 数组，不要输出任何其它文字、解释或代码块标记。";

const FOOD_JSON_GUIDE =
  "每个食物用一个对象表示，包含字段：name（中文食物名，不含数量/量词）、caloriesPer100g（每100克热量，千卡）、proteinPer100g（每100克蛋白质，克）、carbsPer100g（每100克碳水，克）、fatPer100g（每100克脂肪，克）。营养数值请按常见食材给出合理估算。只输出 JSON 数组。";

// 后台切换启用的 Key 后通过 invalidateActiveVisionKey() 失效，避免每次识别都查库。
let cachedKey: { apiKey: string; model: string; baseUrl: string } | undefined;

/**
 * 统一调用千问（qwen3.5-plus 为思考型模型，关闭思考后 content 会直接、稳定地返回 JSON）。
 * 返回模型生成的纯文本 content。
 */
export function invalidateActiveVisionKey() {
  cachedKey = undefined;
}

/** 优先使用后台启用的 Key，未配置时回退到环境变量。 */
async function resolveVisionKey(): Promise<{ apiKey: string; model: string; baseUrl: string }> {
  if (cachedKey !== undefined) return cachedKey;

  const [rows] = await database.query<Array<RowDataPacket & { api_key: string; model: string; base_url: string }>>(
    "SELECT api_key, model, base_url FROM vision_keys WHERE is_active = TRUE LIMIT 1",
  );
  const row = rows[0];
  cachedKey = row
    ? { apiKey: row.api_key, model: row.model, baseUrl: row.base_url }
    : { apiKey: config.DASHSCOPE_API_KEY, model: config.DASHSCOPE_MODEL, baseUrl: config.DASHSCOPE_BASE_URL };
  return cachedKey;
}

async function callQwen(messages: QwenMessage[]): Promise<string> {
  const { apiKey, model, baseUrl } = await resolveVisionKey();
  if (!apiKey) {
    throw new Error("尚未配置千问 API Key，请在后台「识图 Key」中添加并启用，或在 server/.env 中设置 DASHSCOPE_API_KEY。");
  }

  const body = {
    model,
    messages,
    temperature: 0.1,
    enable_thinking: false,
  };
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`千问识别请求失败（${response.status}）：${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content ?? "";
}

/**
 * 调用千问视觉模型识别图片中的食物，返回食物名称及每 100g 的营养估算。
 * 例如：[{"name":"鸡胸肉","caloriesPer100g":133,"proteinPer100g":24.6,"carbsPer100g":0,"fatPer100g":2.8}]
 */
export async function recognizeFoodsFromImage(imageBase64: string, mimeType: string): Promise<VisionFood[]> {
  const content = await callQwen([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        },
        {
          type: "text",
          text: `识别图片中出现的所有食物。${FOOD_JSON_GUIDE} 例如：[{"name":"鸡胸肉","caloriesPer100g":133,"proteinPer100g":24.6,"carbsPer100g":0,"fatPer100g":2.8}]。`,
        },
      ],
    },
  ]);

  const foods = parseFoodList(content);
  if (!foods.length) throw new Error("未能从图片中识别出食物，请换一张更清晰的照片重试。");
  return foods;
}

/**
 * 根据用户文字描述搜索食物，返回食物名称及每 100g 的营养估算。
 */
export async function searchFoodsByText(text: string): Promise<VisionFood[]> {
  const content = await callQwen([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `请根据以下文字描述判断用户吃了什么食物，并给出每种食物的每100克营养估算。描述：${text}\n\n${FOOD_JSON_GUIDE} 例如：[{"name":"米饭","caloriesPer100g":116,"proteinPer100g":2.6,"carbsPer100g":25.9,"fatPer100g":0.3}]。`,
    },
  ]);

  const foods = parseFoodList(content);
  if (!foods.length) throw new Error("未能识别出食物，请补充更具体的描述后重试。");
  return foods;
}

/**
 * 识别食品包装上的营养成分表图片，返回产品名及每 100g（或每 100ml，统一折算为每 100g）的营养成分。
 */
export async function recognizeNutritionFactsFromImage(imageBase64: string, mimeType: string): Promise<VisionFood[]> {
  const content = await callQwen([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        },
        {
          type: "text",
          text: `识别图片中的食品营养成分表，输出 JSON 数组（通常只有一个产品）。name 取包装上的产品名称（若看不清则填「未命名食品」）；caloriesPer100g 为能量（千卡）；proteinPer100g、carbsPer100g、fatPer100g 分别为每100克/100毫升的蛋白质、碳水化合物、脂肪（克）。若表中按「每份」标注，请折算成每100克的数值。只输出 JSON 数组，例如：[{"name":"某品牌饼干","caloriesPer100g":480,"proteinPer100g":8,"carbsPer100g":65,"fatPer100g":22}]。`,
        },
      ],
    },
  ]);

  const foods = parseFoodList(content);
  if (!foods.length) throw new Error("未能识别出营养成分表，请拍清营养标签后重试。");
  return foods;
}

function parseFoodList(raw: string): VisionFood[] {
  const text = raw.trim();
  // 去掉可能的代码块标记
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return [];
    const foods: VisionFood[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object" || !("name" in item)) continue;
      const name = String((item as { name: unknown }).name).trim();
      if (!name) continue;
      const estimate = parseEstimate(item);
      foods.push({ name, estimate });
    }
    return dedupe(foods);
  } catch {
    return [];
  }
}

function parseEstimate(item: unknown): VisionFood["estimate"] {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const num = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return NaN;
  };
  const caloriesPer100g = num(record.caloriesPer100g);
  if (Number.isNaN(caloriesPer100g) || caloriesPer100g < 0) return null;
  const macro = (value: unknown) => {
    const parsed = num(value);
    return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };
  return {
    caloriesPer100g,
    proteinPer100g: macro(record.proteinPer100g),
    carbsPer100g: macro(record.carbsPer100g),
    fatPer100g: macro(record.fatPer100g),
  };
}

function dedupe(foods: VisionFood[]) {
  const seen = new Set<string>();
  return foods.filter((food) => {
    if (seen.has(food.name)) return false;
    seen.add(food.name);
    return true;
  });
}
