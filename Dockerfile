# ---------- Stage 1: build the React UI ----------
FROM node:20-alpine AS ui-build
WORKDIR /ui

# Copy only UI first for better caching
COPY patient-ui/package*.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the UI code and build
COPY patient-ui/ ./
RUN npm run build

# ---------- Stage 2: build & publish .NET API ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dotnet-build
WORKDIR /src

# Copy csproj separately to leverage restore cache
COPY PatientApi.csproj ./
RUN dotnet restore

# Copy the rest of the API source and publish
COPY . .
RUN dotnet publish -c Release -o /app/publish

# ---------- Stage 3: final runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy API
COPY --from=dotnet-build /app/publish ./

# Copy built UI into wwwroot so ASP.NET can serve it
COPY --from=ui-build /ui/dist ./wwwroot

# Kestrel must listen on PORT provided by Render
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}

# (Optional but nice) default to Production
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose is not strictly required on Render, but harmless
EXPOSE 10000

# Start the app
ENTRYPOINT ["dotnet", "PatientApi.dll"]