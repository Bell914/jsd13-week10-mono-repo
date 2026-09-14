import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const authUser = async (req, res, next) => {
  // รองรับทั้ง HttpOnly Cookie (Browser) และ Bearer Token Header (Postman/REST Client)
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  const token = req.cookies?.accessToken || bearerToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token!",
    });
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    let role = decodedToken.role;
    if (!role) {
      const user = await User.findById(decodedToken.userId).select("role");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User no longer exists",
        });
      }
      role = user.role;
    }

    req.user = {
      _id: decodedToken.userId,
      role,
      user: {
        _id: decodedToken.userId,
        role,
      },
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};