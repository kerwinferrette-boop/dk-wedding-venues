const SHEET_ID = '1JUtOiOq7kjNoVB8JEGysWZ7lm-TpVVlzEvnPNb6Q4z8'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function sheetUrl(params) {
  const sheet = params?.sheet
  const gid = params?.gid ?? '0'
  if (sheet) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`
  }
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  const url = sheetUrl(event.queryStringParameters)

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Sheets returned ${res.status}` }),
      }
    }
    const csv = await res.text()
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'text/csv' },
      body: csv,
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
