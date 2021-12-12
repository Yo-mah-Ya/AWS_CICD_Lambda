import fs from "fs";
import {
    CloudFormationClient,
    CreateStackCommand,
    DeleteStackCommand,
    DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
const client = new CloudFormationClient({ region: process.env.AWS_REGION });

const getEnvValue = (key: string): string => {
    const value = process.env[key];
    if (value == undefined) throw new Error(`Invalid Environment key : ${key}`);
    return value;
};

const PROJECT_PREFIX = getEnvValue("PROJECT_PREFIX");
const PIPELINE_ROLE_ARN = getEnvValue("PIPELINE_ROLE_ARN");
const ARTIFACT_BUCKET = getEnvValue("ARTIFACT_BUCKET");
const REPOSITORY_NAME = getEnvValue("REPOSITORY_NAME");
const CODEBUILD_PROJECT_NAME = getEnvValue("CODEBUILD_PROJECT_NAME");
const DEPLOY_ROLE_FOR_CODEPIPELINE_ARN = getEnvValue(
    "DEPLOY_ROLE_FOR_CODEPIPELINE_ARN"
);
const PACKAGED_TEMPLATE_FILE_PATH = getEnvValue("PACKAGED_TEMPLATE_FILE_PATH");
const DEPLOY_PARAM_FILE = getEnvValue("DEPLOY_PARAM_FILE");

const createStack = async (branchName: string): Promise<void> => {
    const cfnParameterWith = (
        key: string,
        value: string
    ): { ParameterKey: string; ParameterValue: string } => ({
        ParameterKey: key,
        ParameterValue: value,
    });
    await client.send(
        new CreateStackCommand({
            StackName: `${PROJECT_PREFIX}CICD-${branchName}`,
            TemplateBody: fs.readFileSync("pipeline.yml", {
                encoding: "utf-8",
            }),
            Parameters: [
                cfnParameterWith("ProjectPrefix", PROJECT_PREFIX),
                cfnParameterWith("ArtifactStoreBucket", ARTIFACT_BUCKET),
                cfnParameterWith(
                    "StackName",
                    `${PROJECT_PREFIX}App-${branchName}`
                ),
                cfnParameterWith("RepositoryName", REPOSITORY_NAME),
                cfnParameterWith(
                    "CodeBuildProjectName",
                    CODEBUILD_PROJECT_NAME
                ),
                cfnParameterWith("BranchName", branchName),
                cfnParameterWith("CodePipelineRoleArn", PIPELINE_ROLE_ARN),
                cfnParameterWith(
                    "DeployRoleForCodePipelineArn",
                    DEPLOY_ROLE_FOR_CODEPIPELINE_ARN
                ),
                cfnParameterWith(
                    "PackagedTemplateFilePath",
                    PACKAGED_TEMPLATE_FILE_PATH
                ),
                cfnParameterWith("DeployParamFile", DEPLOY_PARAM_FILE),
            ],
            Capabilities: ["CAPABILITY_AUTO_EXPAND"],
        })
    );
};

const deleteStack = async (branchName: string): Promise<void> => {
    const stackName = `${PROJECT_PREFIX}CICD-${branchName}`;
    const stacks = await client.send(
        new DescribeStacksCommand({ StackName: stackName })
    );
    if (!stacks.Stacks || stacks.Stacks.length === 0) {
        return;
    }
    client.send(new DeleteStackCommand({ StackName: stackName }));
};
type LambdaEvent = {
    detail: {
        repositoryName: string;
        event: string;
        referenceName: string;
    };
};
export const handler = async (
    event: LambdaEvent
): Promise<{ status: string }> => {
    console.dir(JSON.stringify(event));
    const detail = event.detail;
    if (detail.repositoryName !== REPOSITORY_NAME) {
        throw new Error(`Invalid repositoryName${detail.repositoryName}`);
    }
    if (detail.event === "referenceCreated") {
        await createStack(detail.referenceName);
    } else if (detail.event === "referenceDeleted") {
        await deleteStack(detail.referenceName);
    }
    return { status: "OK" };
};
