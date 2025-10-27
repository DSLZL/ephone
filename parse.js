/**
 * 【终极健壮版】解析AI返回的、可能格式不规范的响应内容
 * @param {string} content - AI返回的原始字符串
 * @returns {Array} - 一个标准化的消息对象数组
 */
function parseAiResponse(content) {
  const trimmedContent = content.trim();

  // 方案1：【最优先】尝试作为标准的、单一的JSON数组解析
  // 这是最理想、最高效的情况
  if (trimmedContent.startsWith("[") && trimmedContent.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmedContent);
      if (Array.isArray(parsed)) {
        console.log("解析成功：标准JSON数组格式。");
        return parsed;
      }
    } catch (e) {
      // 如果解析失败，说明它虽然看起来像个数组，但内部格式有问题。
      // 此时我们不报错，而是继续尝试下面的“强力解析”方案。
      console.warn("标准JSON数组解析失败，将尝试强力解析...");
    }
  }

  // 方案2：【强力解析】使用正则表达式，从混乱的字符串中提取出所有独立的JSON对象
  // 这能完美解决您遇到的 "(Timestamp: ...)[{...}](Timestamp: ...)[{...}]" 这种格式
  const jsonMatches = trimmedContent.match(/{[^{}]*}/g);

  if (jsonMatches) {
    const results = [];
    for (const match of jsonMatches) {
      try {
        // 尝试解析每一个被我们“揪”出来的JSON字符串
        const parsedObject = JSON.parse(match);
        results.push(parsedObject);
      } catch (e) {
        // 如果某个片段不是有效的JSON，就忽略它，继续处理下一个
        console.warn("跳过一个无效的JSON片段:", match);
      }
    }

    // 如果我们成功提取出了至少一个有效的JSON对象，就返回这个结果
    if (results.length > 0) {
      console.log("解析成功：通过强力提取模式。");
      return results;
    }
  }

  // 方案3：【最终备用】如果以上所有方法都失败了，说明AI返回的可能就是纯文本
  // 我们将原始的、未处理的内容，包装成一个标准的文本消息对象返回，确保程序不会崩溃
  console.error("所有解析方案均失败！将返回原始文本。");
  return [{ type: "text", content: content }];
}
