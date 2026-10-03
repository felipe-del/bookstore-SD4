const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};
const res = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });
const isPreflight = (event) => event.httpMethod === 'OPTIONS';
const preflight = () => ({ statusCode: 200, headers: HEADERS, body: '' });
module.exports = { res, isPreflight, preflight };
