using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddFixedPriceListings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFixedPrice",
                table: "Needs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PriceNudgeSentAt",
                table: "Needs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "NeedPriceWatches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NeedId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NeedPriceWatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NeedPriceWatches_Needs_NeedId",
                        column: x => x.NeedId,
                        principalTable: "Needs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NeedPriceWatches_NeedId_UserId",
                table: "NeedPriceWatches",
                columns: new[] { "NeedId", "UserId" },
                unique: true);

            // Prices named on a product's price page were already firm: carry them over as fixed prices.
            migrationBuilder.Sql(
                "UPDATE \"Needs\" SET \"IsFixedPrice\" = TRUE WHERE \"ProductId\" IS NOT NULL AND \"MaxBudget\" > 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NeedPriceWatches");

            migrationBuilder.DropColumn(
                name: "IsFixedPrice",
                table: "Needs");

            migrationBuilder.DropColumn(
                name: "PriceNudgeSentAt",
                table: "Needs");
        }
    }
}
