import http from 'node:http'

const targetOrigin = process.env.WECOM_LOCAL_TARGET || 'http://zookk.run:5173'
const port = Number(process.env.WECOM_CALLBACK_PORT || 80)

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'zookk.run'}`)

  if (requestUrl.pathname !== '/login/wecom-callback') {
    response.statusCode = 302
    response.setHeader('Location', targetOrigin)
    response.end()
    return
  }

  const redirectUrl = new URL('/login/wecom-callback', targetOrigin)
  requestUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.append(key, value)
  })

  response.statusCode = 302
  response.setHeader('Location', redirectUrl.toString())
  response.end()
})

server.listen(port, '0.0.0.0', () => {
  console.log(`WeCom local callback bridge: http://zookk.run/login/wecom-callback -> ${targetOrigin}/login/wecom-callback`)
})
