var jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  // 1. check if header is present
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  //2. extract token from header
  const token = authHeader.split(" ")[1];
  try {
    //3. verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //4. attach user info to request object
    req.user = decoded;

    //5. contine
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = authMiddleware;
