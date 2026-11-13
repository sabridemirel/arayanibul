using System.Net;
using System.Net.Mail;
using API.Interfaces;

namespace API.Services;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(string toAddress, string subject, string htmlBody, string textBody)
    {
        var section = _configuration.GetSection("Email");
        var host = section["Host"];

        if (string.IsNullOrWhiteSpace(host))
        {
            // Development fallback: no SMTP configured, log the email instead of sending it.
            _logger.LogInformation(
                "Email:Host is not configured; email not sent. To: {To} | Subject: {Subject}\n{Body}",
                toAddress, subject, textBody);
            return true;
        }

        try
        {
            var port = int.TryParse(section["Port"], out var p) ? p : 587;
            var enableSsl = !bool.TryParse(section["EnableSsl"], out var ssl) || ssl;
            var fromAddress = string.IsNullOrWhiteSpace(section["FromAddress"]) ? section["Username"] : section["FromAddress"];
            var fromName = string.IsNullOrWhiteSpace(section["FromName"]) ? "Arayanibul" : section["FromName"];

            if (string.IsNullOrWhiteSpace(fromAddress))
            {
                _logger.LogError("Email:FromAddress is not configured; cannot send email to {To}", toAddress);
                return false;
            }

            using var message = new MailMessage
            {
                From = new MailAddress(fromAddress, fromName),
                Subject = subject,
                SubjectEncoding = System.Text.Encoding.UTF8,
                BodyEncoding = System.Text.Encoding.UTF8,
                Body = textBody,
                IsBodyHtml = false
            };
            message.To.Add(new MailAddress(toAddress));
            message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
                htmlBody, System.Text.Encoding.UTF8, "text/html"));

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            var username = section["Username"];
            if (!string.IsNullOrWhiteSpace(username))
            {
                client.Credentials = new NetworkCredential(username, section["Password"]);
            }

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {To} with subject {Subject}", toAddress, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To} with subject {Subject}", toAddress, subject);
            return false;
        }
    }

    public Task<bool> SendPasswordResetEmailAsync(string toAddress, string firstName, string resetLink)
    {
        var name = string.IsNullOrWhiteSpace(firstName) ? "Merhaba" : $"Merhaba {firstName}";
        var encodedName = WebUtility.HtmlEncode(name);
        var encodedLink = WebUtility.HtmlEncode(resetLink);

        const string subject = "Arayanibul şifre sıfırlama";

        var textBody =
$@"{name},

Arayanibul hesabınız için bir şifre sıfırlama isteği aldık. Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı açın:

{resetLink}

Bu bağlantı sınırlı bir süre için geçerlidir ve yalnızca bir kez kullanılabilir.

Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmeyecektir.

Arayanibul";

        var htmlBody =
$@"<!DOCTYPE html>
<html lang=""tr"">
<head><meta charset=""utf-8""><title>{subject}</title></head>
<body style=""font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5;"">
  <p>{encodedName},</p>
  <p>Arayanibul hesabınız için bir şifre sıfırlama isteği aldık. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın:</p>
  <p><a href=""{encodedLink}"" style=""display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;"">Şifremi sıfırla</a></p>
  <p>Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br><a href=""{encodedLink}"">{encodedLink}</a></p>
  <p>Bu bağlantı sınırlı bir süre için geçerlidir ve yalnızca bir kez kullanılabilir.</p>
  <p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmeyecektir.</p>
  <p>Arayanibul</p>
</body>
</html>";

        return SendEmailAsync(toAddress, subject, htmlBody, textBody);
    }
}
