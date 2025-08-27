# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# copy csproj & restore
COPY *.csproj ./
RUN dotnet restore

# copy the rest & publish
COPY . .
RUN dotnet publish -c Release -o /app/publish

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

# Render sets PORT; bind to it
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}

# If your project builds PatientApi.dll (default), this is correct:
CMD ["dotnet", "PatientApi.dll"]