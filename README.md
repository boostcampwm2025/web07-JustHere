# 딱! 여기 (Just Here)

<p align="center">
  <img alt="딱! 여기 - 메인 이미지" src="https://github.com/user-attachments/assets/a971430e-3fc3-40a4-a900-5861f56ffc5b" />
</p>

<h4 align="center">
  딱! 여기 는 여러 사람이 함께 모여야 하는 상황에서
  <br/>
  <span style="color: #5046E5; font-weight: 700;">어디서 만날지</span>라는 복잡한 의사결정을
  <span style="color: #5046E5; font-weight: 700;">실시간 협업 방식</span>으로 해결해주는 서비스다.
</h4>

<div align="center">

| [📋 프로젝트 위키](https://github.com/boostcampwm2025/web07-JustHere/wiki) | [🎨 디자인 프로토타입](https://www.figma.com/design/WfhqUuOyyqQ8i8nnZ2eVvo/%ED%8E%98%EC%9D%B4%EC%A7%80-%EB%94%94%EC%9E%90%EC%9D%B8?node-id=0-1&t=UPl0gl2R2kTWENeR-1) | [🚀 프로젝트 백로그](https://github.com/orgs/boostcampwm2025/projects/209) |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |

</div>

## 프로젝트 소개

> 자세한 내용은 [기획서](https://www.notion.so/2df37262a179806cbe76ed7115570e25?source=copy_link)를 참고해 주세요.

<img  alt="딱! 여기 - 핵심 가치" width="888" height="409" alt="image" src="https://github.com/user-attachments/assets/1383ab48-1fff-4183-8425-b55b1e27a81a" />


## 팀 소개

> 팀 문화가 궁금하다면 [그라운드 룰](https://github.com/boostcampwm2025/web07-JustHere/wiki/%EA%B7%B8%EB%9D%BC%EC%9A%B4%EB%93%9C-%EB%A3%B0)을 참고해 주세요.

<div align="center">

|                                                                                    J051                                                                                    |                                                                                   J262                                                                                   |                                                                     J005                                                                     |                                                                                     J097                                                                                     |                                                                                     J222                                                                                      |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| [<img src="https://i.namu.wiki/i/qWyoh8nA_DcTuY4gqcmkFC2k5Sbn8D6yVCVRQHMhJD-eRYtugUDNg6jP-v0VqbnFdCjL4jYrepNXw9ey8ouFAA.webp" width="100px">](https://github.com/ppochaco) | [<img src="https://i.namu.wiki/i/5Veq9acZq3uqIUMsQbKyf4wjHiuk500_e7LUTtdWvG_2m7Wax-Anb5bFATOMsQReegqabE05_P6Swl9h9vUl3g.webp" width="100px">](https://github.com/ho0010) | [<img src="https://upload.wikimedia.org/wikipedia/ko/4/4a/%EC%8B%A0%EC%A7%B1%EA%B5%AC.png" width="100px">](https://github.com/kang-min-seok) | [<img src="https://i.namu.wiki/i/zfd-NOPP39XJ49BUBLXu8d3SAPsYnpvqYviuQHzSe8FqI6DhYAaHp5Nx30dWi_Q5XGUcbczMfuSp1lOMAN3NvA.webp" width="100px">](https://github.com/U-Geon.png) | [<img src="https://i.namu.wiki/i/hWLEwQhnjvdoRZQhrgHMKAZjiSVPO5D86_nBD6OCVLHamm0dM7Ssv2KTfYgjJj-V_X3hMsgV-LeIgI7lmbqzhA.webp" width="100px">](https://github.com/withonewith) |
|                                                                                   김아진                                                                                   |                                                                                  지호준                                                                                  |                                                                    강민석                                                                    |                                                                                     류건                                                                                     |                                                                                    이혜린                                                                                     |

</div>

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.x 이상
- npm 또는 yarn
- Docker (선택사항)

### 설치 및 실행 방법

**1. pnpm 설치**

**2. 아래 명령어 수행**
```
# 저장소 클론
git clone https://github.com/{your-org}/web07-justhere.git
cd web07-justhere
```

**3. 로컬 환경 변수 등록**

- `apps/backend/.env.local`
```
DATABASE_URL="postgresql://{myuser}:{mypassword}@localhost:5432/{mydatabase}?schema=public"
KAKAO_API_BASE_URL=https://dapi.kakao.com
KAKAO_REST_API_KEY={Kakao REST API Key}
```

- `apps/frontend/.env.local`
```
VITE_KAKAO_MAP_API_KEY={Kakao Javascript KEY}
```

**4. 서비스 실행**
```
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm run dev
```

## 🛠 기술 스택

### Package Manager & Build
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%23F69220.svg?style=for-the-badge&logo=pnpm&logoColor=white)

### Language
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

### Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React Konva](https://img.shields.io/badge/React_Konva-0D86FF?style=for-the-badge&logo=react&logoColor=white)
![Kakao Maps](https://img.shields.io/badge/Kakao_Maps_SDK-FFCD00?style=for-the-badge&logo=kakao&logoColor=black)

### Backend
![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=Swagger&logoColor=black)

### Real-time & Collaboration
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![Y.js](https://img.shields.io/badge/Y.js-FCCB2C?style=for-the-badge&logoColor=white)

### Database
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

### DevOps & Infra
![Naver Cloud Platform](https://img.shields.io/badge/Naver_Cloud_Platform-03C75A?style=for-the-badge&logo=naver&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)

### Testing
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)


## 아키텍처 다이어그램

### 서비스 아키텍처

<img width="4164" height="2724" alt="image" src="https://github.com/user-attachments/assets/ae862b8b-bfa8-44e0-a9da-b6e08d211235" />


### CI / CD 파이프라인

<img width="3364" height="2284" alt="image" src="https://github.com/user-attachments/assets/dac3ac8c-e8a4-4ac7-9de1-5659c7b81c5a" />
