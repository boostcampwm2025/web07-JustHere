# 로컬 개발 환경 설정 가이드

## 목차

1. [필수 요구사항](#필수-요구사항)
2. [Docker를 사용한 MySQL 설정](#docker를-사용한-mysql-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [데이터베이스 연결 확인](#데이터베이스-연결-확인)
5. [트러블슈팅](#트러블슈팅)

---

## 필수 요구사항

- Docker 및 Docker Compose 설치
- pnpm 설치
- Node.js 18 이상

### Docker 설치 확인

```bash
docker --version
docker-compose --version
```

---

## Docker를 사용한 MySQL 설정

### 1. Docker Compose로 MySQL 컨테이너 실행

프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다:

```bash
docker-compose up -d
```

이 명령어는 다음을 수행합니다:

- MySQL 8.0 이미지를 다운로드 (최초 실행 시)
- `just_here` 데이터베이스 생성
- 포트 3306에서 MySQL 서비스 시작
- 컨테이너를 백그라운드에서 실행 (`-d` 옵션)

### 2. 컨테이너 상태 확인

```bash
docker-compose ps
```

정상적으로 실행 중이라면 다음과 같은 출력을 확인할 수 있습니다:

```
NAME              IMAGE       COMMAND                  STATUS
just-here-mysql   mysql:8.0   "docker-entrypoint.sh"   Up
```

### 3. MySQL 로그 확인

```bash
docker-compose logs mysql
```

또는 실시간 로그 확인:

```bash
docker-compose logs -f mysql
```

### 4. 컨테이너 중지 및 제거

개발이 끝나면 다음 명령어로 컨테이너를 중지할 수 있습니다:

```bash
# 컨테이너 중지
docker-compose stop

# 컨테이너 중지 및 제거 (데이터는 유지됨)
docker-compose down

# 컨테이너 중지 및 제거 + 볼륨까지 삭제 (데이터 삭제)
docker-compose down -v
```

---

## 환경 변수 설정

### Backend 환경 변수 설정

`apps/backend/.env` 파일을 생성하고 다음 내용을 입력합니다:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=justhere
DB_PASSWORD=justherepassword
DB_DATABASE=just_here
PORT=3000
```

> **참고**: Docker Compose의 기본 설정을 사용하는 경우 위 값들을 그대로 사용하면 됩니다.
>
> 만약 다른 설정을 사용하고 싶다면 `docker-compose.yml`의 `environment` 섹션을 수정하고, `.env` 파일도 함께 수정해야 합니다.

### 환경 변수 설명

| 변수명        | 설명              | 기본값             |
| ------------- | ----------------- | ------------------ |
| `DB_HOST`     | MySQL 호스트 주소 | `localhost`        |
| `DB_PORT`     | MySQL 포트        | `3306`             |
| `DB_USERNAME` | MySQL 사용자명    | `justhere`         |
| `DB_PASSWORD` | MySQL 비밀번호    | `justherepassword` |
| `DB_DATABASE` | 데이터베이스 이름 | `just_here`        |
| `PORT`        | Backend 서버 포트 | `3000`             |

---

## 데이터베이스 연결 확인

### 1. Docker 컨테이너를 통한 MySQL 접속

```bash
docker-compose exec mysql mysql -u justhere -pjustherepassword just_here
```

또는 root 계정으로 접속:

```bash
docker-compose exec mysql mysql -u root -prootpassword
```

### 2. 로컬 MySQL 클라이언트를 통한 접속

로컬에 MySQL 클라이언트가 설치되어 있다면:

```bash
mysql -h localhost -P 3306 -u justhere -pjustherepassword just_here
```

### 3. Backend 서버 실행 및 연결 확인

```bash
# Backend 서버 실행
pnpm --filter backend dev
```

서버가 정상적으로 시작되면 다음과 같은 로그를 확인할 수 있습니다:

```
[Nest] INFO [TypeOrmModule] Successfully connected to database
```

### 4. 데이터베이스 연결 테스트 쿼리

MySQL에 접속한 후 다음 쿼리로 연결을 확인할 수 있습니다:

```sql
-- 현재 데이터베이스 확인
SELECT DATABASE();

-- 사용자 권한 확인
SHOW GRANTS FOR 'justhere'@'%';

-- 테이블 목록 확인
SHOW TABLES;
```

---

## 트러블슈팅

### 포트 충돌 문제

**증상**: `Error: bind: address already in use`

**해결 방법**:

1. 기존 MySQL 서비스가 실행 중인지 확인:

   ```bash
   # macOS/Linux
   lsof -i :3306

   # Windows
   netstat -ano | findstr :3306
   ```

2. 기존 MySQL 서비스를 중지하거나 `docker-compose.yml`에서 포트를 변경:
   ```yaml
   ports:
     - "3307:3306" # 호스트 포트를 3307로 변경
   ```

### 컨테이너가 시작되지 않는 경우

**증상**: `docker-compose up` 실행 후 컨테이너가 바로 종료됨

**해결 방법**:

1. 로그 확인:

   ```bash
   docker-compose logs mysql
   ```

2. 컨테이너 재시작:

   ```bash
   docker-compose restart mysql
   ```

3. 볼륨 삭제 후 재시작 (데이터 초기화):
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### 연결 거부 오류

**증상**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**해결 방법**:

1. 컨테이너가 실행 중인지 확인:

   ```bash
   docker-compose ps
   ```

2. 컨테이너 재시작:

   ```bash
   docker-compose restart mysql
   ```

3. 환경 변수 확인:
   - `apps/backend/.env` 파일의 `DB_HOST`, `DB_PORT` 값 확인
   - Docker Compose의 포트 매핑 확인

### 권한 오류

**증상**: `Access denied for user 'justhere'@'localhost'`

**해결 방법**:

1. 환경 변수의 사용자명과 비밀번호 확인:
   - `apps/backend/.env` 파일 확인
   - `docker-compose.yml`의 `MYSQL_USER`, `MYSQL_PASSWORD` 확인

2. 컨테이너 재시작:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### 데이터베이스가 생성되지 않는 경우

**증상**: `Unknown database 'just_here'`

**해결 방법**:

1. 컨테이너에 직접 접속하여 데이터베이스 생성:

   ```bash
   docker-compose exec mysql mysql -u root -prootpassword -e "CREATE DATABASE IF NOT EXISTS just_here CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

2. 또는 `docker/mysql/init.sql` 파일 확인 후 컨테이너 재시작

---

## 추가 참고사항

### 데이터 영속성

Docker Compose는 `mysql_data` 볼륨을 사용하여 데이터를 저장합니다.
컨테이너를 삭제해도 `docker-compose down` (볼륨 삭제 옵션 없이) 실행 시 데이터는 유지됩니다.

### 데이터 초기화

데이터를 완전히 초기화하려면:

```bash
docker-compose down -v
docker-compose up -d
```

### 백업 및 복원

**백업**:

```bash
docker-compose exec mysql mysqldump -u root -prootpassword just_here > backup.sql
```

**복원**:

```bash
docker-compose exec -T mysql mysql -u root -prootpassword just_here < backup.sql
```

---

## 관련 파일

- `docker-compose.yml`: Docker Compose 설정 파일
- `docker/mysql/init.sql`: MySQL 초기화 스크립트
- `apps/backend/.env.example`: Backend 환경 변수 예시 파일
- `apps/backend/.env`: Backend 환경 변수 파일 (로컬에서 생성 필요)
