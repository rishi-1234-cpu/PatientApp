# ---------- Build React UI ----------
FROM node:20-alpine AS ui-build
WORKDIR /ui

# copy only package files first for better caching
COPY PatientApi/patient-ui/package*.json ./
RUN npm ci --no-audit --no-fund

# now copy the rest of the UI and build
COPY PatientApi/patient-ui/ .
RUN npm run build

# ---------- Build & publish .NET API ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# copy the API project and restore/publish
COPY PatientApi/ PatientApi/
RUN dotnet restore PatientApi/PatientApi.csproj
RUN dotnet publish PatientApi/PatientApi.csproj -c Release -o /app/publish

# ---------- Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# publish output
COPY --from=build /app/publish .

# static files (React) -> wwwroot
RUN mkdir -p /app/wwwroot
COPY --from=ui-build /ui/dist/ /app/wwwroot/

# Render sets PORT; bind Kestrel to it
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}

# start the API
CMD ["dotnet", "PatientApi.dll"]
