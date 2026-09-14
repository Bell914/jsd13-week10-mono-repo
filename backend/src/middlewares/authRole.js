/**
 * Authorization Middleware
 * ตรวจสอบสิทธิ์ (Role) ของผู้ใช้หลังจากผ่าน Authentication แล้ว
 * หากไม่มีสิทธิ์ ให้ตอบกลับด้วย HTTP Status 403 Forbidden
 */

export const requireAdmin = (req, res, next) => {
  const role = req.user?.role || req.user?.user?.role;

  if (!req.user || role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Admin access required",
    });
  }

  next();
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role || req.user?.user?.role;

    if (!req.user || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${allowedRoles.join(", ")}] role`,
      });
    }

    next();
  };
};
