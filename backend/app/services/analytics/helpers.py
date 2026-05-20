def reliability(sample_size: int, minimum: int) -> dict:
    """
    Simple reliability function that checks if the sample size meets a minimum threshold.
    This can be used to determine if analytics results are likely to be reliable based on the number
    of reviews or data points available.
    """
    return {
        "is_reliable": sample_size >= minimum,
        "sample_size": sample_size,
        "min_required": minimum
    }