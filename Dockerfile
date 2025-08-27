# ---------- Build the React UI ----------
FROM node:18-alpine AS ui-build
WORKDIR /ui
COPY patient-ui/package*.json ./
RUN npm ci
COPY patient-ui/ ./
RUN npm run build

# ---------- Build & publish the .NET API ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first for better layer caching
COPY *.sln ./
COPY PatientApi/PatientApi.csproj PatientApi/
RUN dotnet restore PatientApi/PatientApi.csproj

# Copy the rest and publish
COPY . .
RUN dotnet publish PatientApi/PatientApi.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---------- Runtime image ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# App
COPY --from=build /app/publish .
# React build -> wwwroot (served by Program.cs)
RUN mkdir -p /app/wwwroot
COPY --from=ui-build /ui/dist/ ./wwwroot/

# Render provides PORT; bind Kestrel to it
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}

# Start the API
CMD ["dotnet", "PatientApi.dll"]