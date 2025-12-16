-- 데이터베이스 생성 (이미 docker-compose에서 생성되지만 명시적으로 생성)
CREATE DATABASE IF NOT EXISTS just_here CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 권한 부여
GRANT ALL PRIVILEGES ON just_here.* TO 'justhere'@'%';
FLUSH PRIVILEGES;
