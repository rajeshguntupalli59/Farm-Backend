const sendPush = async (pushToken, title, body) => {
  if (!pushToken?.startsWith('ExponentPushToken[')) return
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: pushToken, title, body, sound: 'default', priority: 'high' }),
    })
  } catch {}
}

module.exports = { sendPush }
