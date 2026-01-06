export default async function handler(req, res) {
  try {
    const token = process.env.NOTION_TOKEN;
    const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;

    const now = new Date();
    const year = Number(
      new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(now)
    );

    const start = `${year}-01-01T00:00:00+09:00`;
    const end = `${year + 1}-01-01T00:00:00+09:00`;

    let sum = 0;
    let start_cursor = undefined;

    while (true) {
      const body = {
        page_size: 100,
        filter: {
          and: [
            { timestamp: "created_time", created_time: { on_or_after: start } },
            { timestamp: "created_time", created_time: { before: end } }
          ]
        },
         :contentReference[oaicite:9]{index=9}
        sorts: [{ timestamp: "created_time", direction: "ascending" }],
        ...(start_cursor ? { start_cursor } : {})
      };

      const r = await fetch(
        `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2025-09-03",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );

      if (!r.ok) {
        const text = await r.text();
        return res.status(500).json({ error: "Notion API error", detail: text });
      }

      const data = await r.json();
      const results = data.results ?? [];

      for (const page of results) {
        const v = page?.properties?.["Read Count"]?.formula?.number;
        if (typeof v === "number" && Number.isFinite(v)) sum += v;
      }

      if (!data.has_more || !data.next_cursor) break;
      start_cursor = data.next_cursor;
    }

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    res.status(200).json({ value: sum, year });
  } catch (e) {
    res.status(500).json({ error: "server error", detail: String(e) });
  }
}
