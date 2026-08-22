# Netlify 배포 안내

## 404의 직접 원인

이 프로젝트의 Vite 클라이언트 결과물은 프로젝트 루트가 아니라 **`dist/public`**에 생성됩니다. 또한 프로젝트 원본을 Netlify에 직접 끌어다 놓으면 빌드가 실행되지 않아, Netlify가 배포할 `index.html`을 찾지 못하고 기본 `Page not found` 화면을 표시할 수 있습니다. `netlify.toml`은 정적 결과물 경로를 `dist/public`으로 지정하고, 모든 클라이언트 경로가 `index.html`로 처리되도록 재작성 규칙을 제공합니다.

> Netlify는 `netlify.toml`의 재작성 규칙 또는 배포 폴더 안의 `_redirects` 파일로 경로 처리를 구성합니다. 빌드 도구를 사용할 때에는 해당 파일이 실제 배포 폴더에 포함되어야 합니다. [1]

## 권장 배포 방식

Netlify에서 **Add new site → Import an existing project**를 선택한 뒤 `cholmi1/MANUS_CHINA` 저장소를 연결합니다. 빌드 명령은 `pnpm run build:netlify`, 배포 디렉터리는 `dist/public`으로 지정합니다. 저장소 루트의 `netlify.toml`이 인식되면 이 값들은 자동 적용됩니다. 프로젝트 원본을 수동 드래그앤드롭하는 방식은 사용하지 않습니다.

## 풀스택 기능 유의사항

Netlify는 프런트엔드를 제공하고, `/api/*`와 `/manus-storage/*` 요청은 기존 Manus 배포 도메인으로 프록시합니다. 따라서 로그인, 사용자별 저장, XLSX 내보내기, S3 파일은 기존 백엔드를 계속 사용합니다. Netlify 환경 변수에는 `VITE_APP_ID`와 `VITE_OAUTH_PORTAL_URL`을 추가해야 로그인 버튼이 올바른 OAuth 주소를 생성합니다. 이 값은 기존 프로젝트의 환경 변수 설정에서 확인해 입력하며, 서버 전용 비밀값은 Netlify에 복사하지 않습니다.

## 수동 배포가 꼭 필요한 경우

로컬에서 `pnpm install --frozen-lockfile && pnpm run build:netlify`를 실행한 뒤, **프로젝트 전체가 아니라 `dist/public` 폴더의 내용만** Netlify Deploys 화면에 업로드합니다. 이 방식은 이후 GitHub 자동 배포보다 실수 가능성이 높습니다.

## 재배포 확인

배포가 완료되면 루트 주소뿐 아니라 새로고침한 해시 없는 경로도 `index.html`로 응답하는지 확인합니다. 이어서 로그인, 상담기록 저장, 증빙 파일 열기, 엑셀 내보내기를 순서대로 점검합니다. OAuth 리디렉션 주소 제한으로 로그인이 막히면 기존 Manus 호스팅을 사용하거나 OAuth 애플리케이션에 Netlify 도메인을 허용 주소로 추가해야 합니다.

## References

[1]: https://docs.netlify.com/manage/routing/redirects/overview/ "Netlify Docs — Redirects and rewrites"
