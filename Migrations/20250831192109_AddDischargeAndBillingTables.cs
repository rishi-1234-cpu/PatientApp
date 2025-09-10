using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PatientApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDischargeAndBillingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "TakenAt",
                table: "Vitals",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "TEXT",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Patients",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "TEXT",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateTable(
                name: "Billings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PatientId = table.Column<int>(type: "INTEGER", nullable: false),
                    AdmissionId = table.Column<int>(type: "INTEGER", nullable: false),
                    BilledAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RoomCharges = table.Column<decimal>(type: "TEXT", nullable: false),
                    TreatmentCharges = table.Column<decimal>(type: "TEXT", nullable: false),
                    MedicationCharges = table.Column<decimal>(type: "TEXT", nullable: false),
                    OtherCharges = table.Column<decimal>(type: "TEXT", nullable: false),
                    Discount = table.Column<decimal>(type: "TEXT", nullable: false),
                    Tax = table.Column<decimal>(type: "TEXT", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    AdmissionId1 = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Billings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Billings_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Billings_Admissions_AdmissionId1",
                        column: x => x.AdmissionId1,
                        principalTable: "Admissions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Billings_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Discharges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PatientId = table.Column<int>(type: "INTEGER", nullable: false),
                    AdmissionId = table.Column<int>(type: "INTEGER", nullable: false),
                    DischargeDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Instructions = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    FollowUp = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    OutstandingAmount = table.Column<decimal>(type: "TEXT", nullable: true),
                    AdmissionId1 = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Discharges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Discharges_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Discharges_Admissions_AdmissionId1",
                        column: x => x.AdmissionId1,
                        principalTable: "Admissions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Discharges_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Billings_AdmissionId",
                table: "Billings",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Billings_AdmissionId1",
                table: "Billings",
                column: "AdmissionId1",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Billings_PatientId",
                table: "Billings",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Discharges_AdmissionId",
                table: "Discharges",
                column: "AdmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Discharges_AdmissionId1",
                table: "Discharges",
                column: "AdmissionId1",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Discharges_PatientId",
                table: "Discharges",
                column: "PatientId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Billings");

            migrationBuilder.DropTable(
                name: "Discharges");

            migrationBuilder.AlterColumn<DateTime>(
                name: "TakenAt",
                table: "Vitals",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Patients",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "TEXT");
        }
    }
}
