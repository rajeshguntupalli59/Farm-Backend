const prisma = require('../utils/prisma')

const DEFAULTS = {
  business_phone:  '8897132032',
  whatsapp_number: '918897132032',
  upi_id:          '8897132032@sbi',
  upi_name:        'Kruthik Farm',
}

const getSettings = async (req, res) => {
  try {
    const rows = await prisma.setting.findMany()
    const saved = {}
    rows.forEach(r => saved[r.key] = r.value)
    res.json({ ...DEFAULTS, ...saved })
  } catch (err) {
    res.status(500).json({ message: 'Failed to load settings' })
  }
}

const updateSettings = async (req, res) => {
  try {
    const { business_phone, whatsapp_number, upi_id, upi_name } = req.body
    const entries = { business_phone, whatsapp_number, upi_id, upi_name }
    await Promise.all(
      Object.entries(entries)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([key, value]) =>
          prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        )
    )
    res.json({ message: 'Settings saved' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to save settings' })
  }
}

module.exports = { getSettings, updateSettings }
