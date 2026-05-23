/**
 * 1. Payload nằm trong JWT (Cả Access và Refresh Token)
 * Dùng 'sub' để đúng chuẩn quốc tế của JWT.
 */
export type JwtPayload = {
  sub: number; // ID người dùng
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
};

/**
 * 2. Payload mở rộng cho chiến lược Refresh Token
 * Dùng khi cần so khớp chuỗi Token gửi lên với Database.
 */
export type JwtPayloadWithRt = JwtPayload & { refreshToken: string };

/**
 * 3. Đối tượng User sau khi được gán vào Request (req.user)
 * Chuyển 'sub' thành 'userId' để code ở Controller/Guard "thuần" camelCase.
 */
export interface RequestUser {
  userId: number;
  email: string;
  roles: string[];
  refreshToken?: string;
}
