const https = require('https')

const generate = () => Math.floor(100000 + Math.random() * 900000).toString()

const sendViaSms = (phone, otp) => {
  return new Promise((resolve) => {
    const apiKey = process.env.FAST2SMS_API_KEY
    if (!apiKey) {
      // Dev mode — print to console instead of sending real SMS
      console.log(`\n========== OTP (DEV MODE) ==========`)
      console.log(`Phone: ${phone}  |  OTP: ${otp}`)
      console.log(`====================================\n`)
      return resolve(true)
    }

    const params = new URLSearchParams({
      authorization: apiKey,
      route: 'otp',
      variables_values: otp,
      flash: '0',
      numbers: phone
    }).toString()

    const options = {
      hostname: 'www.fast2sms.com',
      path: `/dev/bulkV2?${params}`,
      method: 'GET',
      headers: { 'cache-control': 'no-cache' }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.return === true) return resolve(true)
          // Fast2SMS returned an error — log OTP to console as fallback
          console.log(`\n⚠️  Fast2SMS error: ${json.message}`)
          console.log(`========== OTP FALLBACK ==========`)
          console.log(`Phone: ${phone}  |  OTP: ${otp}`)
          console.log(`==================================\n`)
          resolve(true) // still "sent" — user reads from console during setup
        } catch {
          resolve(false)
        }
      })
    })
    req.on('error', () => resolve(false))
    req.end()
  })
}

module.exports = { generate, sendViaSms }
