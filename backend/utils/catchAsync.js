module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // Call next(err) if Promise rejects
  };
};
