# ---------- Build the React UI (Vite) ----------
FROM node:20-alpine AS ui
WORKDIR /ui
COPY patient-ui/package*.json ./
RUN npm ci
COPY patient-ui/ ./
RUN npm run build # outputs to /ui/dist

# ---------- Build the .NET API ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /out

# ---------- Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
# API
COPY --from=build /out .
# UI -> serve from wwwroot
COPY --from=ui /ui/dist ./wwwroot

# Render provides PORT; bind Kestrel to it
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}

CMD ["dotnet", "PatientApi.dll"]
