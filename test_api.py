#!/usr/bin/env python3
"""
多用户AI知识库助手 - API测试脚本
这个脚本会测试所有API端点，确保系统正常工作
"""

import requests
import sys
import json
import time

# API配置
BASE_URL = "http://localhost:8000"
TEST_USERNAME = "test_user_" + str(int(time.time()))
TEST_PASSWORD = "test_password_123"

def test_endpoint(name, method, url, data=None, headers=None, files=None):
    """测试一个API端点"""
    print(f"\n{'='*60}")
    print(f"测试: {name}")
    print(f"URL: {url}")
    print(f"方法: {method}")
    
    if data:
        print(f"请求数据: {json.dumps(data, ensure_ascii=False)}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            if files:
                response = requests.post(url, headers=headers, files=files, timeout=30)
            else:
                response = requests.post(url, headers=headers, json=data, timeout=10)
        else:
            print(f"❌ 不支持的方法: {method}")
            return False
        
        print(f"状态码: {response.status_code}")
        
        try:
            response_data = response.json()
            print(f"响应数据: {json.dumps(response_data, ensure_ascii=False, indent=2)}")
        except:
            print(f"响应文本: {response.text[:200]}")
        
        if response.status_code >= 400:
            print(f"❌ 请求失败!")
            return False
        
        print(f"✅ 测试通过!")
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ 连接失败! 请确保服务器正在运行")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 多用户AI知识库助手 - API测试脚本")
    print("="*60)
    
    # 测试根路径
    success = test_endpoint(
        "根路径访问",
        "GET",
        f"{BASE_URL}/"
    )
    
    if not success:
        print("❌ 服务器未响应，请先运行: python main.py")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("API功能测试")
    print("="*60)
    
    token = None
    
    # 测试1: 用户注册
    success = test_endpoint(
        "用户注册",
        "POST",
        f"{BASE_URL}/register",
        data={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        }
    )
    
    if not success:
        # 可能是用户已存在，尝试登录
        print("\n⚠️  注册失败，尝试登录已有用户...")
    
    # 测试2: 用户登录
    success = test_endpoint(
        "用户登录",
        "POST",
        f"{BASE_URL}/login",
        data={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        }
    )
    
    if success:
        # 获取token
        try:
            response = requests.post(f"{BASE_URL}/login", json={
                "username": TEST_USERNAME,
                "password": TEST_PASSWORD
            })
            data = response.json()
            if "token" in data:
                token = data["token"]
                print(f"\n✅ 获取Token成功: {token[:50]}...")
        except:
            pass
    
    # 测试3: 获取用户信息（需要认证）
    if token:
        test_endpoint(
            "获取用户信息",
            "GET",
            f"{BASE_URL}/me",
            headers={"Authorization": f"Bearer {token}"}
        )
    
    # 测试4: 文件上传（需要认证）
    if token:
        # 创建一个测试文件
        with open("test_file.txt", "w") as f:
            f.write("这是一个测试文件，用于AI知识库测试。\n")
            f.write("文件上传功能测试。\n")
        
        try:
            print(f"\n{'='*60}")
            print("测试: 文件上传")
            print(f"URL: {BASE_URL}/upload")
            print(f"方法: POST")
            
            with open("test_file.txt", "rb") as f:
                files = {"file": ("test_file.txt", f, "text/plain")}
                headers = {"Authorization": f"Bearer {token}"}
                
                response = requests.post(f"{BASE_URL}/upload", headers=headers, files=files, timeout=30)
                
                print(f"状态码: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"响应数据: {json.dumps(response_data, ensure_ascii=False, indent=2)}")
                except:
                    print(f"响应文本: {response.text[:200]}")
                
                if response.status_code >= 400:
                    print(f"❌ 请求失败!")
                else:
                    print(f"✅ 测试通过!")
            
            # 删除测试文件
            import os
            os.remove("test_file.txt")
            
        except Exception as e:
            print(f"❌ 文件上传测试失败: {e}")
    
    # 测试5: 对话功能（需要认证）
    if token:
        test_endpoint(
            "AI对话",
            "POST",
            f"{BASE_URL}/chat",
            headers={"Authorization": f"Bearer {token}"},
            data={
                "messages": [
                    {"role": "user", "content": "你好，请介绍一下知识库的内容"}
                ],
                "chatId": "test_chat_123"
            }
        )
    
    # 总结
    print("\n" + "="*60)
    print("测试完成!")
    print("="*60)
    print("\n如果所有测试都通过，说明系统正常工作!")
    print("\n下一步：")
    print("1. 配置.env文件中的FastGPT API密钥")
    print("2. 使用浏览器访问 http://localhost:8000")
    print("3. 注册新用户并测试完整功能")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n测试已取消")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)