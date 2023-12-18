// 提供全局变量供外部调用
import fs from 'fs'
import sizeOf from 'image-size'
import fetch, { Blob, FormData } from 'node-fetch'

/**
 * 处理传入的图片文件，返回图片宽、高、转存后的url
 * 可以是http://、file://、base64://、buffer
 * @param {string|Buffer} file - 传入的图片文件
 * @returns {Object} dimensions - 图片的尺寸和转存后的url
 * @returns {number} dimensions.width - 图片的宽度
 * @returns {number} dimensions.height - 图片的高度
 * @returns {string} dimensions.url - 图片转存到本机后的公网url
 */
async function imgProc (file) {
  const time = `${Date.now()}.jpg`
  const fileNew = process.cwd() + `/plugins/Lain-plugin/resources/QQBotApi/${time}`

  let buffer
  if (Buffer.isBuffer(file)) {
    buffer = file
  } else if (file.startsWith('file://')) {
    buffer = fs.readFileSync(file.slice(7))
  } else if (file.startsWith('base64://')) {
    buffer = Buffer.from(file.slice(9), 'base64')
  } else if (/^http(s)?:\/\//.test(file)) {
    let res = await fetch(file)
    if (!res.ok) {
      throw new Error(`请求错误！状态码: ${res.status}`)
    } else {
      buffer = Buffer.from(await res.arrayBuffer())
    }
  } else {
    throw new Error('传入的文件类型不符合规则，只接受url、buffer、file://路径或者base64编码的图片')
  }

  fs.writeFileSync(fileNew, buffer)

  const dimensions = sizeOf(buffer)
  const { width, height } = dimensions
  const { port, QQBotImgIP, QQBotPort, QQBotImgToken } = Bot.lain.cfg
  let url = `http://${QQBotImgIP}:${QQBotPort || port}/api/QQBot?token=${QQBotImgToken}&name=${time}`
  return { width, height, url }
}

/**
 * 上传文件到三方云盘
 * @param {string|Buffer} file - 文件，支持file://、base64://、Buffer
 * @returns {string} url - 文件上传后的url地址
 */
async function uploadFile (file) {
  if (!(Buffer.isBuffer(file) || file instanceof Uint8Array)) {
    if (file.startsWith('file://')) {
      file = fs.readFileSync(file.replace('file://', ''))
    } else if (file.startsWith('base64://')) {
      file = Buffer.from(file.replace('base64://', ''), 'base64')
    } else {
      throw new Error('无法识别文件类型')
    }
  }

  let url = Bot.lain.cfg.FigureBed
  const formData = new FormData()
  formData.append('imgfile', new Blob([file], { type: 'image/jpeg' }), 'image.jpg')

  const res = await fetch(url, {
    method: 'POST',
    body: formData
  })

  if (res.ok) {
    const { result } = await res.json()
    url = url.replace('/uploadimg', '') + result.path
    console.log('上传成功：', url)
    return url
  }

  throw new Error('上传失败')
}

/** 赋值给全局Bot */
Bot.imgProc = imgProc
Bot.uploadFile = uploadFile

export { imgProc, uploadFile }