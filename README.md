<div align="center">

# 딱! 여기 (Just Here)

<img width="850" height="500" alt="image (1)" src="https://github.com/user-attachments/assets/25035f74-d113-434d-8932-e051e573c23d" />

[![Wiki](https://img.shields.io/badge/📋_Wiki-000?style=for-the-badge)](https://github.com/boostcampwm2025/web07-JustHere/wiki)
[![Figma](https://img.shields.io/badge/🎨_Design-F24E1E?style=for-the-badge)](https://www.figma.com/design/WfhqUuOyyqQ8i8nnZ2eVvo/%ED%8E%98%EC%9D%B4%EC%A7%80-%EB%94%94%EC%9E%90%EC%9D%B8?node-id=0-1&t=UPl0gl2R2kTWENeR-1)
[![Backlog](https://img.shields.io/badge/🚀_Backlog-blue?style=for-the-badge)](https://github.com/orgs/boostcampwm2025/projects/209)

</div>

<br/>

## 프로젝트 소개


<img width="700" alt="image" src="https://github.com/user-attachments/assets/7df91103-b3fc-44c5-8b51-e0582ce57353" />


**딱! 여기**는 여러 사람이 함께 모여야 하는 상황에서 **"어디서 만날까?"** 라는 복잡한 고민을 <br/>
**실시간 협업 보드** 위에서 함께 정리해 나갈 수 있도록 도와주는 서비스입니다.

> 자세한 내용은 [기획서](https://www.notion.so/2df37262a179806cbe76ed7115570e25?source=copy_link)를 참고해 주세요.

<br/>

## 서비스 탄생 배경
> _저녁 뭐 먹지? → 여기 어때? → 그것도 괜찮네 → 또 다른 데는? → 다 좋아 근데… → 그래서 어디 감?_

여러 명이 함께 모일 때 **장소를 정하는 과정**은 생각보다 어렵고 번거롭습니다.

| 문제                   | 설명                                           |
| :--------------------- | :--------------------------------------------- |
| **취향 충돌**          | 사람마다 원하는 분위기·조건이 다름          |
| **의견 발산**          | 후보는 계속 늘어나지만, 하나로 결론 내리기 어려움 |
| **결정 부담**          | 누군가 정하면 책임이 생기고, 안 정하면 계속 반복됨 |
| **공유의 번거로움**    | 지도 앱에서 찾고 → 단톡방에 보내고 → 설명까지 해야 함 |
| **함께 정하는 느낌 부족** | 모두가 각자 다른 화면을 보며 따로 결정하는 분위기가 됨 |

**딱! 여기** 서비스는 **장소 탐색 → 의견 공유 → 후보 수렴 → 투표 → 최종 확정**까지  
모임 장소 결정을 하나의 실시간 경험으로 연결하고자 합니다.

<br/>

## 주요 기능

### 😌 쉽고 간편하게!

![온보딩](https://github.com/user-attachments/assets/b5a35c67-9cb2-426e-9c49-51cc489eca98)

- 만나고자 하는 지역만 설정한다면, 간편하게 방을 만들어요!
- 링크 공유를 통해 쉽게 접근해요!

<br/>

### 🤝 모두 다같이 함께!

![메인](https://github.com/user-attachments/assets/e17fde5f-cc36-4f94-9c3b-44d9e09ce30c)


- Socket.io 기반 실시간 통신 화이트보드 환경을 제공해요!
- 관심있는 지역을 검색하고 화이트보드에 **장소 카드**를 붙여봐요!
- **드로잉, 포스트잇, 글자 입력** 모두 가능!
- **커서 챗**으로 함께 대화하며 의견을 나눠요!

<br/>

### 🗳️ 이제는 결정할 때!

![투표](https://github.com/user-attachments/assets/945fd1cf-d0c7-4acf-97fc-4423da60a301)

- 나눈 의견을 바탕으로 가고 싶은 장소를 투표해요!
- 모두 함께 투표가 끝나면 최종 결과를 확인할 수 있어요!

<br/>

## 기술 스택

<table>
  <tr>
    <th>구분</th>
    <th>기술</th>
  </tr>
  <tr>
    <td><b>Common</b></td>
    <td>
      <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
      <img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white"/>
      <img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white"/>
    </td>
  </tr>
  <tr>
    <td><b>Frontend</b></td>
    <td>
      <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black"/>
      <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white"/>
      <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white"/>
      <img src="https://img.shields.io/badge/React_Konva-0D86FF?style=flat-square&logo=react&logoColor=white"/>
      <img src="https://img.shields.io/badge/Google_Maps-4285F4?style=flat-square&logo=googlemaps&logoColor=white"/>
    </td>
  </tr>
  <tr>
    <td><b>Backend</b></td>
    <td>
      <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white"/>
      <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white"/>
      <img src="https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black"/>
    </td>
  </tr>
  <tr>
    <td><b>Real-time</b></td>
    <td>
      <img src="https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white"/>
      <img src="https://img.shields.io/badge/Y.js-FCCB2C?style=flat-square&logoColor=white"/>
    </td>
  </tr>
  <tr>
    <td><b>Database</b></td>
    <td>
      <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white"/>
    </td>
  </tr>
  <tr>
    <td><b>Infra</b></td>
    <td>
      <img src="https://img.shields.io/badge/Naver_Cloud-03C75A?style=flat-square&logo=naver&logoColor=white"/>
      <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white"/>
      <img src="https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white"/>
      <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white"/>
    </td>
  </tr>
  <tr>
    <td><b>Monitoring</b></td>
    <td>
      <img src="https://img.shields.io/badge/Prometheus-E6522C?style=flat-square&logo=prometheus&logoColor=white"/>
      <img src="https://img.shields.io/badge/Grafana-F46800?style=flat-square&logo=grafana&logoColor=white"/>
      <img src="https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white"/>
    </td>
  </tr>
  <tr>
    <td><b>Testing</b></td>
    <td>
      <img src="https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white"/>
      <img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white"/>
    </td>
  </tr>
</table>

<br/>

## 설치 방법

### 필수 요구사항

- Node.js 20.x 이상
- [pnpm](https://pnpm.io/installation)
- Docker

### 설치 및 실행

**1. 저장소 클론**

```bash
git clone https://github.com/boostcampwm2025/web07-JustHere.git
cd web07-JustHere
```

**2. 의존성 설치**

```bash
pnpm install
```

**3. 환경 변수 설정**

`apps/backend/.env`

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydb?schema=public"
GOOGLE_MAPS_API_KEY={Google Maps API Key}
PORT=3000
```

`apps/frontend/.env`

```env
VITE_GOOGLE_MAPS_API_KEY={Google Maps API Key}
VITE_GOOGLE_MAP_ID={Google Map ID}
```

**4. 실행**

```bash
# (필요 시) 로컬 인프라 (PostgreSQL, Prometheus, Grafana)
docker compose -f docker-compose.local.yml up -d

# Prisma 마이그레이션
pnpm --filter backend exec prisma migrate dev

# 개발 서버
pnpm run dev
```

<br/>

## 인프라 아키텍처

### 서비스 아키텍처

<img width="4528" height="2944" alt="image" src="https://github.com/user-attachments/assets/01c42e93-bae8-4461-a09e-93eee1f0c6d3" />

### CI / CD 파이프라인

<img width="3364" height="2284" alt="CI/CD 파이프라인" src="https://github.com/user-attachments/assets/dac3ac8c-e8a4-4ac7-9de1-5659c7b81c5a" />

## 팀 소개

> 팀 문화가 궁금하다면 [그라운드 룰](https://github.com/boostcampwm2025/web07-JustHere/wiki/%EA%B7%B8%EB%9D%BC%EC%9A%B4%EB%93%9C-%EB%A3%B0)을 참고해 주세요.

<div align="center">

|                                                                                    J051                                                                                    |                                                                                   J262                                                                                   |                                                                     J005                                                                     |                                                                                     J097                                                                                     |                                                                                     J222                                                                                      |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| [<img src="https://i.namu.wiki/i/qWyoh8nA_DcTuY4gqcmkFC2k5Sbn8D6yVCVRQHMhJD-eRYtugUDNg6jP-v0VqbnFdCjL4jYrepNXw9ey8ouFAA.webp" width="100px">](https://github.com/ppochaco) | [<img src="https://i.namu.wiki/i/5Veq9acZq3uqIUMsQbKyf4wjHiuk500_e7LUTtdWvG_2m7Wax-Anb5bFATOMsQReegqabE05_P6Swl9h9vUl3g.webp" width="100px">](https://github.com/ho0010) | [<img src="https://upload.wikimedia.org/wikipedia/ko/4/4a/%EC%8B%A0%EC%A7%B1%EA%B5%AC.png" width="100px">](https://github.com/kang-min-seok) | [<img src="https://i.namu.wiki/i/zfd-NOPP39XJ49BUBLXu8d3SAPsYnpvqYviuQHzSe8FqI6DhYAaHp5Nx30dWi_Q5XGUcbczMfuSp1lOMAN3NvA.webp" width="100px">](https://github.com/U-Geon.png) | [<img src="https://i.namu.wiki/i/hWLEwQhnjvdoRZQhrgHMKAZjiSVPO5D86_nBD6OCVLHamm0dM7Ssv2KTfYgjJj-V_X3hMsgV-LeIgI7lmbqzhA.webp" width="100px">](https://github.com/withonewith) |
|                                                                                   김아진                                                                                   |                                                                                  지호준                                                                                  |                                                                    강민석                                                                    |                                                                                     류건                                                                                     |                                                                                    이혜린                                                                                     |

</div>

<br/>
