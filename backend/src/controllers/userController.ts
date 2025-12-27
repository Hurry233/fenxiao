import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import InviteBinding from '../models/InviteBinding';
import CommissionRecord from '../models/CommissionRecord';
import DistributorConfig from '../models/DistributorConfig';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 生成JWT token
const generateToken = (userId: string, role: string = 'user') => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 用户注册
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, phone, email, inviteCode } = req.body;

    // 验证必填字段
    if (!username || !password || !phone) {
      return res.status(400).json({ message: '用户名、密码和手机号是必填项' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 检查手机号是否已存在
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: '手机号已注册' });
    }

    // 密码哈希
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建新用户
    const user = new User({
      username,
      password_hash: passwordHash,
      phone,
      email,
      is_distributor: false,
      distributor_level: 'level1',
      is_active: true,
      total_valid_spend: 0
    });

    await user.save();

    // 如果有邀请码，创建邀请绑定
    if (inviteCode) {
      const inviter = await User.findOne({ username: inviteCode });
      if (inviter && inviter._id.toString() !== user._id.toString()) {
        const binding = new InviteBinding({
          inviter_id: inviter._id,
          invitee_id: user._id,
          commission_rate: 0.1 // 默认佣金比例
        });
        await binding.save();
      }
    }

    // 生成JWT token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      code: 0,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone,
          email: user.email,
          is_distributor: user.is_distributor,
          distributor_level: user.distributor_level
        }
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 用户登录
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码是必填项' });
    }

    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    if (!user.is_active) {
      return res.status(401).json({ message: '账户已被禁用' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 生成JWT token
    const token = generateToken(user._id.toString());

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone,
          email: user.email,
          is_distributor: user.is_distributor,
          distributor_level: user.distributor_level,
          total_valid_spend: user.total_valid_spend
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取用户信息
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const user = await User.findById(userId).select('-password_hash');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      code: 0,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新用户信息
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { username, email, avatar } = req.body;

    const user = await User.findById(userId).select('-password_hash');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      code: 0,
      message: '更新成功',
      data: user
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 绑定邀请码
export const bindInviteCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { inviteCode } = req.body;

    // 查找邀请人
    const inviter = await User.findOne({ username: inviteCode });
    if (!inviter) {
      return res.status(400).json({ message: '邀请码无效' });
    }

    // 检查是否已绑定
    const existingBinding = await InviteBinding.findOne({ invitee_id: userId });
    if (existingBinding) {
      return res.status(400).json({ message: '您已经绑定了邀请关系' });
    }

    // 创建邀请绑定
    const binding = new InviteBinding({
      inviter_id: inviter._id,
      invitee_id: userId,
      commission_rate: 0.1 // 默认佣金比例
    });
    await binding.save();

    // 更新用户为分销商
    await User.findByIdAndUpdate(userId, { is_distributor: true });

    res.json({
      code: 0,
      message: '邀请码绑定成功',
      data: binding
    });
  } catch (error) {
    console.error('绑定邀请码错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 申请成为分销商
export const applyDistributor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    user.is_distributor = true;
    user.distributor_level = 'level1';
    await user.save();

    res.json({
      code: 0,
      message: '申请成功',
      data: user
    });
  } catch (error) {
    console.error('申请分销商错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};