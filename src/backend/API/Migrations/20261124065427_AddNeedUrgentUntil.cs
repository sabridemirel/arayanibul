using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddNeedUrgentUntil : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UrgentUntil",
                table: "Needs",
                type: "timestamp with time zone",
                nullable: true);

            // Existing urgent needs get a showcase slot counted from their creation date
            // (Urgency: Urgent = 3).
            migrationBuilder.Sql(
                "UPDATE \"Needs\" SET \"UrgentUntil\" = \"CreatedAt\" + INTERVAL '7 days' WHERE \"Urgency\" = 3;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UrgentUntil",
                table: "Needs");
        }
    }
}
