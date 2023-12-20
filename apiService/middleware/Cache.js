export default function Cache(req, res, next) {
  // here you can define period in second, this one is 5 minutes
  const period = 60 * 5 

  if (req.method == 'GET') {
    res.set('Cache-control', `public, max-age=${period}`)
  } else {
    res.set('Cache-control', `no-store`)
  }

  next()
}