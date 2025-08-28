# ---------- Stage 1: build the React UI ----------
FROM node:20-alpine AS ui-build
WORKDIR /ui
COPY patient-ui/package*.json ./
RUN npm ci --no-audit --no-fund
COPY patient-ui/ .
RUN npm run build

# ---------- Stage 2: build the .NET API ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS dotnet-build
WORKDIR /src
COPY . .
RUN dotnet restore ./PatientApi.csproj
RUN dotnet publish -c Release -o /app/publish

# ---------- Stage 3: final runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app

# runtime env (Render injects PORT)
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
# writable place for SQLite inside container
ENV DB_PATH=/tmp/patient.db

# API
COPY --from=dotnet-build /app/publish/ ./

# UI -> wwwroot
COPY --from=ui-build /ui/dist/ ./wwwroot/

# start
CMD ["dotnet", "PatientApi.dll"]
