namespace API.Models;

public enum UserType
{
    Buyer = 1,
    Provider = 2,
    Both = 3
}

public enum NeedStatus
{
    Active = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4,
    Expired = 5
}

public enum OfferStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3,
    Withdrawn = 4
}

public enum UrgencyLevel
{
    Flexible = 1,
    Normal = 2,
    Urgent = 3
}

public enum MessageType
{
    Text = 1,
    Image = 2,
    Location = 3
}

public enum TransactionStatus
{
    Pending = 1,        // Payment initialized, waiting for user to complete
    Processing = 2,     // Payment in process (3D Secure flow)
    Completed = 3,      // Payment completed, funds in escrow
    Released = 4,       // Funds released to provider
    Refunded = 5,       // Payment refunded to buyer
    Failed = 6,         // Payment failed
    Cancelled = 7       // Transaction cancelled
}

public enum PaymentGateway
{
    Iyzico = 1,
    PayTR = 2,
    Stripe = 3
}

public enum VerificationType
{
    Email = 1,
    Phone = 2,
    Identity = 3,      // ID document verification
    Business = 4       // Business/Seller verification
}

public enum VerificationStatus
{
    Pending = 1,       // Verification request submitted, awaiting review
    InReview = 2,      // Under manual review by admin
    Approved = 3,      // Verification approved
    Rejected = 4       // Verification rejected
}

[Flags]
public enum VerificationBadges
{
    None = 0,
    EmailVerified = 1 << 0,      // 1
    PhoneVerified = 1 << 1,      // 2
    IdentityVerified = 1 << 2,   // 4
    BusinessVerified = 1 << 3    // 8
}