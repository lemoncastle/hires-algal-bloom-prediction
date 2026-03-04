const QRCode = require('qrcode')

const url = 'https://lemoncastle.github.io/hires-algal-bloom-prediction/'

QRCode.toFile('website_qr.png', url, {
  width: 600,
  margin: 1
}, function (err) {
  if (err) throw err
  console.log('QR code saved!')
})

// run node gen_qr.js in directory to generate QR code for the website and save it as website_qr.png