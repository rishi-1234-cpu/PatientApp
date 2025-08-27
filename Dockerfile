# ---------------- UI build (Node) ----------------
FROM node:20-alpine AS ui-build
WORKDIR /ui

# Copy manifests
COPY patient-ui/package*.json ./

# If package-lock.json exists -> npm ci, otherwise fallback to npm install
RUN sh -c "if [ -f package-lock.json ]; then npm ci; else npm install; fi"

# Copy the rest and build
COPY patient-ui/ ./
RUN npm run build

# ---------------- API build (dotnet) ----------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dotnet-build
WORKDIR /src
COPY . ./
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

# Copy UI to wwwroot
RUN mkdir -p /app/publish/wwwroot
COPY --from=ui-build /ui/dist/ /app/publish/wwwroot/

# ---------------- Runtime ----------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
COPY --from=dotnet-build /app/publish ./
CMD ["dotnet", "PatientApi.dll"]
