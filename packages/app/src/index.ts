type LambdaRequest = {
    message: string;
};
type LambdaResponse = {
    statusCode: number;
    body: {
        message: string;
    };
};
export const handler = async (
    event: LambdaRequest
): Promise<LambdaResponse> => {
    console.dir(event);
    return {
        statusCode: 200,
        body: {
            message: event.message,
        },
    };
};
