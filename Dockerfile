# ---------------- UI build (Node) ----------------
FROM node:20-alpine AS ui-build
WORKDIR /ui

# Install deps first for better cache
COPY patient-ui/package*.json ./
RUN npm ci

# Copy the rest of the UI and build
COPY patient-ui/ ./
RUN npm run build

# ---------------- API build (dotnet) ----------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dotnet-build
WORKDIR /src

# Copy everything (API + ui folder etc.)
COPY . ./

# Restore & publish the API
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

# Put the compiled UI into wwwroot of the published API
RUN mkdir -p /app/publish/wwwroot
COPY --from=ui-build /ui/dist/ /app/publish/wwwroot/

# ---------------- Runtime ----------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Render sets PORT; bind Kestrel to it
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}

# Copy the published app
COPY --from=dotnet-build /app/publish ./

CMD ["dotnet", "PatientApi.dll"]
