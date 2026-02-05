/**
 * Supabase Edge Function: parse-system-doc
 * Parses bridge bidding system documents using Claude API
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

interface ParseRequest {
  extractedText: string;
  systemName: string;
}

const SYSTEM_PROMPT = `You are an expert bridge bidding system parser. Your task is to analyze bridge bidding system documents and extract the structure as JSON.

IMPORTANT CONTEXT:
- Bridge bidding uses bids like: Pass, 1C, 1D, 1H, 1S, 1NT, 2C, 2D, 2H, 2S, 2NT, etc.
- Auction sequences show multiple bids: "1m-1M-2m" or "1C1H2C" means opener bid 1m, responder bid 1M, opener rebid 2m
- Documents are organized by opening bids (chapters like "1m Opening", "1NT Opening", etc.)

CHAPTER ORGANIZATION:
- Each OPENING BID should be ONE chapter (e.g., "1m Opening", "1M Opening", "1NT Opening")
- Include ALL related content in that chapter: responses, rebids, continuations
- Do NOT create separate chapters for "Rebids by Opener" or "Responder's Rebids" - keep them in the opening bid chapter
- A chapter contains multiple tables and text sections as needed

DISTINGUISHING TABLES vs TEXT:
- BIDDING TABLE: Any content where lines START with bid sequences like:
  - "1C", "1NT", "2H", "Pass"
  - Auction sequences: "1m-1M-2m", "1C1H2C", "1NT-2C-2D"
  - These should be parsed as tables with parent-child bid relationships
- TEXT CONTENT: Prose, philosophy, general agreements WITHOUT bid sequences at line starts
  - "General Agreements" sections with numbered/bullet lists
  - "Slam Bidding" philosophy
  - Explanatory paragraphs

SYMBOL CONVENTIONS:
- C = Clubs, D = Diamonds, H = Hearts, S = Spades
- NT = No Trump
- M = Major (Hearts or Spades), m = minor (Clubs or Diamonds)
- X or Dbl = Double, XX or Rdbl = Redouble

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "chapters": [
    {
      "name": "1m Opening",
      "content": [
        {
          "type": "table",
          "name": "1m Opening Responses",
          "rows": [
            {
              "bid": "1m",
              "meaning": "12-21 HCP, 3+ cards",
              "children": [
                { "bid": "1M", "meaning": "4+ cards, 6+ HCP", "children": [] }
              ]
            }
          ]
        },
        {
          "type": "table",
          "name": "After 1m-1M",
          "rows": [
            {
              "bid": "1m-1M-2m",
              "meaning": "Minimum, no fit",
              "children": []
            }
          ]
        },
        {
          "type": "text",
          "name": "General Agreements",
          "content": "1. Point one\\n2. Point two"
        }
      ]
    }
  ]
}

RULES:
1. ONE chapter per opening bid - include all rebids and continuations in that chapter
2. If a line starts with a bid or auction sequence, it belongs in a TABLE
3. Use "type": "text" ONLY for prose without bid sequences
4. For text content, PRESERVE formatting: numbered lists (1., 2.), bullets (-, •), indentation
5. Return ONLY JSON, no markdown code fences`;

function generateId(): string {
  return crypto.randomUUID();
}

function addIdsToRows(rows: any[]): any[] {
  return rows.map(row => ({
    id: generateId(),
    bid: row.bid || "",
    bidHtmlContent: row.bid ? `<span>${row.bid}</span>` : "",
    meaning: row.meaning || "",
    meaningHtmlContent: row.meaning ? `<span>${row.meaning}</span>` : "",
    children: row.children ? addIdsToRows(row.children) : []
  }));
}

function processClaudeResponse(rawResponse: any): any {
  const chapters = (rawResponse.chapters || []).map((chapter: any) => ({
    name: chapter.name || "Untitled Chapter",
    content: (chapter.content || []).map((item: any) => {
      if (item.type === "text") {
        return {
          type: "text",
          name: item.name || "Untitled",
          content: item.content || ""
        };
      } else {
        // Default to table
        return {
          type: "table",
          name: item.name || "Untitled Table",
          rows: addIdsToRows(item.rows || [])
        };
      }
    })
  }));

  return {
    systemName: rawResponse.systemName || "Untitled System",
    chapters
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeApiKey) {
      throw new Error("CLAUDE_API_KEY not configured");
    }

    const body: ParseRequest = await req.json();
    const { extractedText, systemName } = body;

    if (!extractedText) {
      return new Response(JSON.stringify({ error: "extractedText is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Truncate text if too long (Claude has context limits)
    const maxTextLength = 100000;
    const truncatedText = extractedText.length > maxTextLength
      ? extractedText.substring(0, maxTextLength) + "\n\n[Document truncated due to length...]"
      : extractedText;

    const userPrompt = `Parse this bridge bidding system document named "${systemName || 'Untitled System'}".

DOCUMENT CONTENT:
${truncatedText}

Remember: Return ONLY valid JSON with the structure specified. No markdown, no code fences, no explanation. Use "type": "table" for bidding sequences and "type": "text" for prose/guidelines.`;

    // Call Claude API
    const claudeResponse = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        system: SYSTEM_PROMPT,
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API error:", errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeResult = await claudeResponse.json();
    const responseText = claudeResult.content?.[0]?.text || "";

    // Parse the JSON response
    let parsedJson;
    try {
      // Try to extract JSON if wrapped in code fences
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
      parsedJson = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse Claude response as JSON:", responseText.substring(0, 500));
      throw new Error("Failed to parse Claude response as valid JSON");
    }

    // Process and add IDs to the parsed structure
    const processedSystem = processClaudeResponse(parsedJson);
    processedSystem.systemName = systemName || processedSystem.systemName;

    return new Response(JSON.stringify(processedSystem), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("Error in parse-system-doc:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
