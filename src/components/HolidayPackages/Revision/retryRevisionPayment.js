/**
 * POST /api/holiday-packages/revise/retry-payment
 */
export async function retryRevisionPayment({
  packageId,
  successUrl,
  cancelUrl,
}) {
  if (!packageId) {
    return {
      success: false,
      message: 'Package ID missing. Please refresh and try again.',
    };
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/revise/retry-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          package_id: packageId,
          success_url: successUrl,
          cancel_url: cancelUrl,
          booking_source: 'website',
        }),
      }
    );
    const data = await response.json().catch(() => null);

    if (!response.ok || !(data?.Success || data?.success)) {
      return {
        success: false,
        message:
          data?.Description
          || data?.message
          || data?.Title
          || 'Unable to continue payment. Please try again.',
        data,
      };
    }

    const checkoutUrl = data?.Content?.checkout_url || data?.checkout_url;
    if (!checkoutUrl) {
      return {
        success: false,
        message: 'Checkout URL not found in response.',
        data,
      };
    }

    return { success: true, checkoutUrl, data };
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Unable to retry payment right now.',
    };
  }
}
