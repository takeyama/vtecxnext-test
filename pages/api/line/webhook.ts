import { NextApiRequest, NextApiResponse } from 'next'
import * as vtecxnext from '@vtecx/vtecxnext'
import * as lineutil from 'utils/lineutil'

// 注) リクエストデータがバイナリデータの場合、必ず以下の設定を行う。
export const config = {
  api: {
    bodyParser: false,
  },
}

const getFlexMenu = (userId:string, replyToken:string) => {
  return JSON.stringify({
    to: userId,
    replyToken: replyToken,
    messages: [
      {
        type: 'flex',
        altText: 'お問い合わせFlex Message',
        contents: CONTENTS
      }
    ]
  })
}

const CONTENTS = {
  "type": "bubble",
  "body": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "action": {
          "type": "message",
          "label": "問い合わせ1",
          "text": "1"
        },
        "style": "primary",
        "margin": "10px"
      },
      {
        "type": "button",
        "action": {
          "type": "message",
          "label": "問い合わせ2",
          "text": "2"
        },
        "style": "primary",
        "margin": "10px"
      },
      {
        "type": "button",
        "action": {
          "type": "message",
          "label": "問い合わせ3",
          "text": "3"
        },
        "margin": "10px",
        "style": "primary"
      }
    ]
  }
}

const getAnswer = (userId:string, replyToken:string, reqtext:string) => {
  return JSON.stringify({
    //to: userId,
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: `お問い合わせ ${reqtext} の回答`,
      }
    ]
  })
}

/**
 * LINE Messaging API Webhook
 * @param req request
 * @param res response
 */
const handler = async (req:NextApiRequest, res:NextApiResponse) => {
  console.log(`[LINE webhook] start.`)
  // LINE署名の検証
  const buf = await vtecxnext.buffer(req)
  if (!lineutil.checkSignature(req, buf)) {
    console.log(`[LINE webhook] signature is invalid.`)
    await vtecxnext.log(req, res, `Line signature is invalid.`, 'LINE Webhook')
    res.status(400).send('Line signature is invalid.')
    return
  }
  const str = buf.toString()
  const data = JSON.parse(str)
  console.log(`[LINE webhook] request data = ${JSON.stringify(data)}`)
  await vtecxnext.log(req, res, `request data = ${JSON.stringify(data)}`, 'LINE Webhook')
  if (!data || !data.events || data.events.length < 1) {
    // 処理終了
    return
  }

  const ACTION_MENU = 'お問い合わせ'
  const ACTION_Q1 = '1'
  const ACTION_Q2 = '2'
  const ACTION_Q3 = '3'

  for (const event of data.events) {
    const eventType = event.type ?? 'no type'

    // 特定のメッセージ受信であれば、Flex Messageを送信する。
    if (eventType === 'message' && event.message?.type === 'text' &&
        event.mode === 'active') {
      let body
      if (event.message.text === ACTION_MENU) {
        body = getFlexMenu(event.source?.userId, event.replyToken)
      } else if (event.message.text === ACTION_Q1) {
        body = getAnswer(event.source?.userId, event.replyToken, ACTION_Q1)
      } else if (event.message.text === ACTION_Q2) {
        body = getAnswer(event.source?.userId, event.replyToken, ACTION_Q2)
      } else if (event.message.text === ACTION_Q3) {
        body = getAnswer(event.source?.userId, event.replyToken, ACTION_Q3)
      }

      if (body) {
        console.log(`[LINE webhook] send data = ${JSON.stringify(body)}`)
        await vtecxnext.log(req, res, `send data = ${JSON.stringify(body)}`, 'LINE Webhook')
        try {
          const response = await lineutil.fetchLine(body)
          const resDataStr = await response.text()
          await vtecxnext.log(req, res, `lineutil.fetchLine end. status=${response.status} response data = ${resDataStr}`, 'LINE Webhook')
          
        } catch (e) {
          let msg = ''
          if (e instanceof Error) {
            msg = `${e.name}: ${e.message}`
          } else {
            msg = 'Unexpected error.'
          }
          console.log(`[LINE webhook] Error occured. ${msg}`)
          await vtecxnext.log(req, res, `Error occured. ${msg}`, 'LINE Webhook')
        }
      }
    }
  }
  

  res.status(200).send('send flex message.')
  res.end()
}


export default handler
