// services/geminiService.js

const axios = require("axios");

const generateBlogContent = async ({ title, category, excerpt, readTime }) => {
  try {
    const prompt = `
You are a content writer for a tourism blog.

Based on the following metadata:
- Title: "${title}"
- Category: "${category}"
- Excerpt: "${excerpt}"
- Expected read time: ${readTime || "3"} minutes

Generate only the full body content of the blog article. 
Do not include the title, excerpt, or category in the content. 
Make it informative, engaging, and relevant to the topic. 
Avoid restating the title or excerpt.

Begin the content directly.
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const content =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return content.trim();
  } catch (err) {
    console.error("Gemini API error:", err.message);
    throw new Error("Failed to generate blog content.");
  }
};

module.exports = { generateBlogContent };
