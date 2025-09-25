using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using API.Data;

namespace API.Tests;

public static class TestStartup
{
    public static void ConfigureTestServices(IServiceCollection services)
    {
        // Remove the existing DbContext registration
        var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
        if (descriptor != null)
        {
            services.Remove(descriptor);
        }

        // Remove the ApplicationDbContext registration
        var contextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ApplicationDbContext));
        if (contextDescriptor != null)
        {
            services.Remove(contextDescriptor);
        }

        // Add in-memory database for testing
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseInMemoryDatabase("TestDb_" + Guid.NewGuid());
        });
    }
}