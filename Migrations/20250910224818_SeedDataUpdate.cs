using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PatientApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedDataUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Billings_Admissions_AdmissionId1",
                table: "Billings");

            migrationBuilder.DropForeignKey(
                name: "FK_Discharges_Admissions_AdmissionId1",
                table: "Discharges");

            migrationBuilder.DropIndex(
                name: "IX_Discharges_AdmissionId1",
                table: "Discharges");

            migrationBuilder.DropIndex(
                name: "IX_Billings_AdmissionId1",
                table: "Billings");

            migrationBuilder.DropColumn(
                name: "AdmissionId1",
                table: "Discharges");

            migrationBuilder.DropColumn(
                name: "AdmissionId1",
                table: "Billings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AdmissionId1",
                table: "Discharges",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AdmissionId1",
                table: "Billings",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Discharges_AdmissionId1",
                table: "Discharges",
                column: "AdmissionId1",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Billings_AdmissionId1",
                table: "Billings",
                column: "AdmissionId1",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Billings_Admissions_AdmissionId1",
                table: "Billings",
                column: "AdmissionId1",
                principalTable: "Admissions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Discharges_Admissions_AdmissionId1",
                table: "Discharges",
                column: "AdmissionId1",
                principalTable: "Admissions",
                principalColumn: "Id");
        }
    }
}
