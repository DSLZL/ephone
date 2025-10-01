// ai helpers\nfunction getRandomValue(str) {
        // 检查字符串是否包含逗号
        if (str.includes(',')) {
            // 用逗号分隔字符串并移除多余空格
            const arr = str.split(',').map(item => item.trim());
            // 生成随机索引 (0 到 arr.length-1)
            const randomIndex = Math.floor(Math.random() * arr.length);
            // 返回随机元素
            return arr[randomIndex];
        }
        // 没有逗号则直接返回原字符串
        return str;
    }

function isImage(text,content) {
        let currentImageData = content.image_url.url
        // 提取Base64数据（去掉前缀）
        const base64Data = currentImageData.split(',')[1];
        // 根据图片类型获取MIME类型
        const mimeType = currentImageData.match(/^data:(.*);base64/)[1];
        return [
            {text: `${text.text}用户向你发送了一张图片`},
            {
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            }
        ]
    }

function extractArray(text) {
        // 正则表达式模式：匹配开头的时间戳部分和后续的JSON数组
        const pattern = /^\(Timestamp: (\d+)\)(.*)$/s;
        const match = text.match(pattern);

        if (match) {
            const timestampPart = `(Timestamp: ${match[1]}) `;
            const jsonPart = match[2].trim();

            try {
                // 尝试解析JSON部分
                const parsedJson = JSON.parse(jsonPart);
                // 验证解析结果是否为数组
                if (Array.isArray(parsedJson)) {
                    return [timestampPart, parsedJson[0]];
                }
            } catch (error) {
                // 解析失败，返回原始文本
            }
        }

        // 不匹配格式或解析失败时返回原值
        return text;
    }

function transformChatData(item) {
        let type = {
            send_and_recall:'撤回了消息',
            update_status:'更新了状态',
            change_music:'切换了歌曲',
            create_memory:'记录了回忆',
            create_countdown:'创建了约定/倒计时',
            text:'发送了文本',
            sticker:'发送了表情',
            ai_image:'发送了图片',
            voice_message:'发送了语音',
            transfer:'发起了转账',
            waimai_request:'发起了外卖请求',
            waimai_response:{
                paid:'回应了外卖-同意',
                rejected:'回应了外卖-拒绝'
            },
            video_call_request:'发起了视频通话',
            video_call_response:{
                accept:'回应了视频通话-接受',
                reject:'回应了视频通话-拒绝'
            },
            qzone_post:{
                shuoshuo:'发布了说说',
                text_image:'发布了文字图'
            },
            qzone_comment:'评论了动态',
            qzone_like:'点赞了动态',
            pat_user:'拍一拍了用户',
            block_user:'拉黑了用户',
            friend_request_response:'回应了好友申请',
            change_avatar:'更换了头像',
            share_link:'分享了链接',
            accept_transfer:'回应了转账-接受',
            decline_transfer:'回应了转账-拒绝/退款',
            quote_reply:'引用了回复',
            text:'',
        }
        let res = extractArray(item.content)

        if(Array.isArray(res)){
            let obj = res[1]
            let itemType = obj.type;
            let time = res[0]
            let text = type[itemType];
            if(text){
                if(itemType === 'sticker'){
                    return [{text:`${time}[${text}] 含义是:${obj.meaning}`}]
                }else if(itemType === 'send_and_recall'){
                    return [{text:`${time}[${text}] ${obj.content}`}]
                }else if(itemType === 'update_status'){
                    return [{text:`${time}[${text}] ${obj.status_text}(${obj.is_busy ? '忙碌/离开' : '空闲'})`}]
                }else if(itemType === 'change_music'){
                    return [{text:`${time}[${text}] ${obj.change_music}, 歌名是:${obj.song_name}`}]
                }else if(itemType === 'create_memory'){
                    return [{text:`${time}[${text}] ${obj.description}`}]
                }else if(itemType === 'create_countdown'){
                    return [{text:`${time}[${text}] ${obj.title}(${obj.date})`}]
                }else if(itemType === 'ai_image'){
                    return [{text:`${time}[${text}] 图片描述是:${obj.description}`}]
                }else if(itemType === 'voice_message'){
                    return [{text:`${time}[${text}] ${obj.content}`}]
                }else if(itemType === 'transfer'){
                    return [{text:`${time}[${text}] 金额是:${obj.amount} 备注是:${obj.amount}`}]
                }else if(itemType === 'waimai_request'){
                    return [{text:`${time}[${text}] 金额是:${obj.amount} 商品是:${obj.productInfo}`}]
                }else if(itemType === 'waimai_response'){
                    return [{text:`${time}[${text[obj.status]}] ${obj.status === 'paid' ? '同意' : '拒绝'}`}]
                }else if(itemType === 'video_call_request'){
                    return [{text:`${time}[${text}]`}]
                }}else if(itemType === 'video_call_request'){
                    return [{text:`${time}[${text[obj.decision]}] ${obj.decision === 'accept' ? '同意' : '拒绝'}`}]
                }else if(itemType === 'qzone_post'){
                    return [{text:`${time}[${text[obj.postType]}] ${obj.postType === 'shuoshuo' ? `${obj.content}` : `图片描述是:${obj.hiddenContent} ${obj.publicText ? `文案是: ${obj.publicText}` : ''}`}`}]
                }else if(itemType === 'qzone_comment'){
                    return [{text:`${time}[${text}] 评论的id是: ${obj.postId} 评论的内容是: ${obj.commentText}`}]
                }else if(itemType === 'qzone_like'){
                    return [{text:`${time}[${text}] 点赞的id是: ${obj.postId}`}]
                }else if(itemType === 'pat_user'){
                    return [{text:`${time}[${text}] ${obj.suffix ? obj.suffix  : ''}`}]
                }else if(itemType === 'block_user'){
                    return [{text:`${time}[${text}]`}]
                }else if(itemType === 'friend_request_response'){
                    return [{text:`${time}[${text}] 结果是:${obj.decision === 'accept' ? '同意' : '拒绝'}`}]
                }else if(itemType === 'change_avatar'){
                    return [{text:`${time}[${text}] 头像名是:${obj.name}`}]
                }else if(itemType === 'share_link'){
                    return [{text:`${time}[${text}] 文章标题是:${obj.title}  文章摘要是:${obj.description} 来源网站名是:${obj.source_name} 文章正文是:${obj.content}`}]
                }else if(itemType === 'accept_transfer'){
                    return [{text:`${time}[${text}]`}]
                }else if(itemType === 'accept_transfer'){
                    return [{text:`${time}[${text}]`}]
                }else if(itemType === 'quote_reply'){
                    return [{text:`${time}[${text}] 引用的内容是:${obj.reply_content}`}]
                }else if(itemType === 'text'){
                    return [{text:`${time}${obj.content}`}]
                }
            }

if(Array.isArray(res) && res.length > 1) {
	res = `${res[0]}${res[1].content}`
}

        return [{text:res}]
    }

function toGeminiRequestData(model, apiKey, systemInstruction, messagesForDecision,isGemini) {

	if(!isGemini){
		return undefined
	}

        // 【核心修正】在这里，我们将 'system' 角色也映射为 'user'

        let roleType = {
            user: 'user',
            assistant: 'model',
            system: 'user' // <--- 新增这一行
        }
        return {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getRandomValue(apiKey)}`,
            data: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: messagesForDecision.map((item) => {
                        let  includesImages = false;
                        if(Array.isArray(item.content) && item.content.length === 2){
                              includesImages =  item.content.some((sub)=>{
                                return sub.type === 'image_url' && sub.image_url.url
                            })
                        }
                        return {
                            role: roleType[item.role], // 现在 'system' 会被正确转换为 'user'
                            parts: includesImages ? isImage(item.content[0],item.content[1]) : transformChatData(item)
                        }
                    }),
                    generationConfig: {
                        temperature: 0.8,
                    },
                    "systemInstruction": {
                        "parts": [{
                            "text": systemInstruction
                        }]
                    }
                })
            }
        }
    }

